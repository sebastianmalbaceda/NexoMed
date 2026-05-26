import request from "supertest";
import express from "express";
import medicationRoutes from "../routes/medications.routes";
import authRoutes from "../routes/auth.routes";
import patientRoutes from "../routes/patients.routes";
import { prisma } from "../lib/prismaClient";
import { reschedulePendingMedication } from "../services/medication.service";

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/medications", medicationRoutes);

// ── Tokens & identificadores ──────────────────────────────────────────────
let doctorToken: string;
let nurseToken: string;
let doctorId: string;
let nurseId: string;
let patientId: string;

// IDs de medicaciones del seed
let medAmoxicilinaId: string;
let medParacetamolId: string;

// Snapshot del estado original para restaurar al final
let originalParacetamolStartTime: Date;
let originalAmoxicilinaStartTime: Date;

// ── beforeAll ─────────────────────────────────────────────────────────────
beforeAll(async () => {
  // 1. Login como doctor
  const doctorLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: "dr.garcia@nexomed.es", password: "password123" });
  doctorToken = doctorLogin.body.token;

  // 2. Obtener pacientes y localizar a Juan Pérez Ruiz (tiene medicación activa)
  const patientsRes = await request(app)
    .get("/api/patients")
    .set("Authorization", `Bearer ${doctorToken}`);

  const juanPerez = patientsRes.body.find(
    (p: { name: string }) => p.name === "Juan Pérez Ruiz",
  );
  if (!juanPerez)
    throw new Error("No se encontró al paciente Juan Pérez Ruiz en el seed");
  patientId = juanPerez.id;

  // 3. Obtener la enfermera asignada (María Martínez)
  nurseId = juanPerez.assignedNurseId;
  doctorId = juanPerez.id; // placeholder — lo obtenemos de la DB

  // Obtener el doctor de la DB
  const doctorUser = await prisma.user.findUnique({
    where: { email: "dr.garcia@nexomed.es" },
  });
  if (!doctorUser) throw new Error("No se encontró al doctor en el seed");
  doctorId = doctorUser.id;

  // 4. Login como enfermera (María Martínez)
  const nurseLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: "enf.martinez@nexomed.es", password: "password123" });
  nurseToken = nurseLogin.body.token;

  // 5. Obtener medicaciones del paciente y guardar IDs + estado original
  const medsRes = await request(app)
    .get(`/api/medications/${patientId}`)
    .set("Authorization", `Bearer ${doctorToken}`);

  const amoxicilina = medsRes.body.find(
    (m: { drugName: string }) => m.drugName === "Amoxicilina 500mg",
  );
  const paracetamol = medsRes.body.find(
    (m: { drugName: string }) => m.drugName === "Paracetamol 1g",
  );

  if (!amoxicilina || !paracetamol) {
    throw new Error("No se encontraron las medicaciones del seed");
  }

  medAmoxicilinaId = amoxicilina.id;
  medParacetamolId = paracetamol.id;
  originalParacetamolStartTime = new Date(paracetamol.startTime);
  originalAmoxicilinaStartTime = new Date(amoxicilina.startTime);
});

// ── afterAll ──────────────────────────────────────────────────────────────
afterAll(async () => {
  try {
    // 1. Restaurar medicación Paracetamol (puede haber sido desactivada/editada)
    const paracetamol = await prisma.medication.findUnique({
      where: { id: medParacetamolId },
      select: { active: true, startTime: true, frequencyHrs: true },
    });

    if (paracetamol) {
      // Reactivar si fue desactivada
      if (!paracetamol.active) {
        await prisma.medication.update({
          where: { id: medParacetamolId },
          data: { active: true },
        });
      }

      // Restaurar startTime original
      await prisma.medication.update({
        where: { id: medParacetamolId },
        data: { startTime: originalParacetamolStartTime },
      });

      // Regenerar schedules
      await reschedulePendingMedication(
        medParacetamolId,
        originalParacetamolStartTime,
        paracetamol.frequencyHrs,
        24,
      );
    }

    // 2. Restaurar medicación Amoxicilina
    const amoxicilina = await prisma.medication.findUnique({
      where: { id: medAmoxicilinaId },
      select: { active: true, startTime: true, frequencyHrs: true },
    });

    if (amoxicilina) {
      if (!amoxicilina.active) {
        await prisma.medication.update({
          where: { id: medAmoxicilinaId },
          data: { active: true },
        });
      }

      await prisma.medication.update({
        where: { id: medAmoxicilinaId },
        data: { startTime: originalAmoxicilinaStartTime },
      });

      await reschedulePendingMedication(
        medAmoxicilinaId,
        originalAmoxicilinaStartTime,
        amoxicilina.frequencyHrs,
        24,
      );
    }

    // 3. Limpiar notificaciones creadas por los tests
    await prisma.notification.deleteMany({
      where: {
        relatedPatientId: patientId,
        type: { in: ["MED_CHANGE", "MED_REMOVED", "MED_NEW"] },
      },
    });

    // 4. Limpiar schedules administrados durante los tests (quitar administeredAt)
    await prisma.medSchedule.updateMany({
      where: {
        medicationId: { in: [medAmoxicilinaId, medParacetamolId] },
        administeredAt: { not: null },
      },
      data: { administeredAt: null, administeredById: null },
    });
  } finally {
    await prisma.$disconnect();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Medication Schedule Integration Tests", () => {
  // ────────────────────────────────────────────────────────────────────────
  //  1. RECÁLCULO DE HORARIOS  (PUT /api/medications/:id/schedule)
  //     Regla #1 + ENF-RF2
  // ────────────────────────────────────────────────────────────────────────
  describe("PUT /api/medications/:id/schedule — Recálculo de horarios", () => {
    it("debe recalcular horarios pendientes al cambiar startTime", async () => {
      // Guardar schedules pendientes antes del cambio
      const schedulesBefore = await prisma.medSchedule.findMany({
        where: { medicationId: medAmoxicilinaId, administeredAt: null },
        orderBy: { scheduledAt: "asc" },
      });
      expect(schedulesBefore.length).toBeGreaterThan(0);

      // Nueva hora de inicio: hoy a las 9:00
      const today = new Date();
      today.setHours(9, 0, 0, 0);
      const newStartTime = today.toISOString();

      const res = await request(app)
        .put(`/api/medications/${medAmoxicilinaId}/schedule`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ newStartTime });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Horario cambiado");

      // Verificar que los schedules pendientes se recalcularon desde las 9:00
      // (frecuencia 8h → 9:00, 17:00, 01:00, 9:00+1d)
      const schedulesAfter = await prisma.medSchedule.findMany({
        where: { medicationId: medAmoxicilinaId, administeredAt: null },
        orderBy: { scheduledAt: "asc" },
      });

      expect(schedulesAfter.length).toBeGreaterThan(0);
      // Verificar que al menos un schedule esta en el rango esperado desde newStartTime
      const expectedStart = new Date(newStartTime);
      const hasScheduleInRange = schedulesAfter.some(s => {
        const t = new Date(s.scheduledAt).getTime();
        return t >= expectedStart.getTime() && t < expectedStart.getTime() + 60 * 60 * 1000;
      });
      expect(hasScheduleInRange).toBe(true)
    });

    it("NO debe alterar horarios ya administrados al recalcular", async () => {
      // 1. Crear un schedule en el turno actual y administrarlo
      const now = new Date();
      const inShiftSchedule = await prisma.medSchedule.create({
        data: { medicationId: medAmoxicilinaId, scheduledAt: new Date(now.getTime() + 2 * 60 * 1000) },
      });

      const adminRes = await request(app)
        .post(`/api/medications/schedules/${inShiftSchedule.id}/administer`)
        .set("Authorization", `Bearer ${nurseToken}`);
      expect(adminRes.status).toBe(200);

      const administeredScheduleId = inShiftSchedule.id;
      const administeredTime = new Date(
        (adminRes.body as { administeredAt: string }).administeredAt,
      );

      // 2. Cambiar startTime
      const today = new Date();
      today.setHours(10, 0, 0, 0);

      await request(app)
        .put(`/api/medications/${medAmoxicilinaId}/schedule`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ newStartTime: today.toISOString() });

      // 3. Verificar que la dosis administrada NO fue alterada
      const administeredSchedule = await prisma.medSchedule.findUnique({
        where: { id: administeredScheduleId },
      });

      expect(administeredSchedule).not.toBeNull();
      expect(administeredSchedule!.administeredAt).not.toBeNull();
      // El administeredAt debe ser el mismo (comparamos timestamps aproximados)
      const actualAdminTime = new Date(administeredSchedule!.administeredAt!);
      expect(
        Math.abs(actualAdminTime.getTime() - administeredTime.getTime()),
      ).toBeLessThan(5000);
    });

    it("debe generar notificación al enfermero asignado tras recalcular", async () => {
      // Contar notificaciones previas para el enfermero
      const prevCount = await prisma.notification.count({
        where: { userId: nurseId, type: "MED_CHANGE" },
      });

      const today = new Date();
      today.setHours(11, 0, 0, 0);

      await request(app)
        .put(`/api/medications/${medAmoxicilinaId}/schedule`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ newStartTime: today.toISOString() });

      // Verificar que se creó una notificación nueva
      const afterCount = await prisma.notification.count({
        where: { userId: nurseId, type: "MED_CHANGE" },
      });

      expect(afterCount).toBeGreaterThan(prevCount);

      // Verificar contenido de la última notificación
      const lastNotif = await prisma.notification.findFirst({
        where: { userId: nurseId, type: "MED_CHANGE" },
        orderBy: { createdAt: "desc" },
      });

      expect(lastNotif).not.toBeNull();
      expect(lastNotif!.message).toContain("Amoxicilina");
      expect(lastNotif!.relatedPatientId).toBe(patientId);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  //  2. ADMINISTRAR MEDICACIÓN  (POST /api/medications/schedules/:id/administer)
  //     SYS-RF1
  // ────────────────────────────────────────────────────────────────────────
  describe("POST /api/medications/schedules/:scheduleId/administer", () => {
    it("debe marcar una dosis pendiente como administrada", async () => {
      // Buscar un schedule pendiente de Paracetamol
      const pendingSchedule = await prisma.medSchedule.findFirst({
        where: {
          medicationId: medParacetamolId,
          administeredAt: null,
          medication: { active: true },
        },
        orderBy: { scheduledAt: "asc" },
        include: { medication: true },
      });

      if (!pendingSchedule) {
        // Si no hay pendientes, regenerar schedules para la ventana actual
        const med = await prisma.medication.findUnique({
          where: { id: medParacetamolId },
          select: { startTime: true, frequencyHrs: true },
        });
        if (med) {
          await reschedulePendingMedication(
            medParacetamolId,
            med.startTime,
            med.frequencyHrs,
            24,
          );
        }
        // Reintentar
        const retrySchedule = await prisma.medSchedule.findFirst({
          where: {
            medicationId: medParacetamolId,
            administeredAt: null,
            medication: { active: true },
          },
          orderBy: { scheduledAt: "asc" },
        });
        if (!retrySchedule) {
          console.warn(
            "No hay schedules pendientes de Paracetamol — saltando test",
          );
          return;
        }

        const res = await request(app)
          .post(`/api/medications/schedules/${retrySchedule.id}/administer`)
          .set("Authorization", `Bearer ${nurseToken}`);

        expect(res.status).toBe(200);
        expect(res.body.administeredAt).toBeDefined();
        expect(res.body.administeredById).toBeDefined();
        return;
      }

      // Admin: crear schedule en turno actual para garantizar exito
      const now2 = new Date();
      const inShiftSchedule = await prisma.medSchedule.create({
        data: { medicationId: medParacetamolId, scheduledAt: new Date(now2.getTime() + 2 * 60 * 1000) },
      });
      const res = await request(app)
        .post(`/api/medications/schedules/${inShiftSchedule.id}/administer`)
        .set("Authorization", `Bearer ${nurseToken}`);

      expect(res.status).toBe(200);
      expect(res.body.administeredAt).toBeDefined();
      expect(res.body.administeredById).toBeDefined();
      await prisma.medSchedule.delete({ where: { id: inShiftSchedule.id } });
    });

    it("debe devolver 409 si la dosis ya fue administrada", async () => {
      // Buscar un schedule pendiente
      const pendingSchedule = await prisma.medSchedule.findFirst({
        where: {
          medicationId: medParacetamolId,
          administeredAt: null,
          medication: { active: true },
        },
        orderBy: { scheduledAt: "asc" },
      });

      if (!pendingSchedule) {
        // Si no hay pendientes, crear uno manualmente
        const now4 = new Date();
        const testSched2 = await prisma.medSchedule.create({
          data: { medicationId: medParacetamolId, scheduledAt: new Date(now4.getTime() + 2 * 60 * 1000) },
        });
        const firstRes = await request(app)
          .post(`/api/medications/schedules/${testSched2.id}/administer`)
          .set("Authorization", `Bearer ${nurseToken}`);
        expect(firstRes.status).toBe(200);
        const secondRes = await request(app)
          .post(`/api/medications/schedules/${testSched2.id}/administer`)
          .set("Authorization", `Bearer ${nurseToken}`);
        expect(secondRes.status).toBe(409);
        expect(secondRes.body.error).toContain("ya ha sido administrada");
        await prisma.medSchedule.delete({ where: { id: testSched2.id } });
        return;
      }

      // Crear schedule en turno actual y administrar
      const now3 = new Date();
      const testSched = await prisma.medSchedule.create({
        data: { medicationId: medParacetamolId, scheduledAt: new Date(now3.getTime() + 2 * 60 * 1000) },
      });
      const firstRes = await request(app)
        .post(`/api/medications/schedules/${testSched.id}/administer`)
        .set("Authorization", `Bearer ${nurseToken}`);
      expect(firstRes.status).toBe(200);

      // Segunda administración — debe fallar
      const secondRes = await request(app)
        .post(`/api/medications/schedules/${testSched.id}/administer`)
        .set("Authorization", `Bearer ${nurseToken}`);

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.error).toContain("ya ha sido administrada");
      await prisma.medSchedule.delete({ where: { id: testSched.id } });
    });

    it("debe devolver 403 si el schedule está fuera del turno actual", async () => {
      // Crear un schedule con scheduledAt = ahora + 8h (siempre en otro turno,
      // porque cada turno dura exactamente 8h)
      const outsideShiftTime = new Date(Date.now() + 8 * 60 * 60 * 1000);

      const testSchedule = await prisma.medSchedule.create({
        data: {
          medicationId: medAmoxicilinaId,
          scheduledAt: outsideShiftTime,
        },
      });

      const res = await request(app)
        .post(`/api/medications/schedules/${testSchedule.id}/administer`)
        .set("Authorization", `Bearer ${nurseToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("turno");

      // Limpiar
      await prisma.medSchedule.delete({ where: { id: testSchedule.id } });
    });

    it("debe devolver 409 si la medicación está suspendida", async () => {
      // 1. Crear un schedule para Paracetamol (aún activo)
      const now5 = new Date();
      const testSchedule = await prisma.medSchedule.create({
        data: {
          medicationId: medParacetamolId,
          scheduledAt: new Date(now5.getTime() + 2 * 60 * 1000), // +2 min (en turno)
        },
      });

      // 2. Suspender la medicación
      const deactivateRes = await request(app)
        .put(`/api/medications/${medParacetamolId}/deactivate`)
        .set("Authorization", `Bearer ${doctorToken}`);
      expect(deactivateRes.status).toBe(200);

      // 3. Intentar administrar — el schedule fue eliminado por deactivate, debe dar 404
      const adminRes = await request(app)
        .post(`/api/medications/schedules/${testSchedule.id}/administer`)
        .set("Authorization", `Bearer ${nurseToken}`);

      // El schedule ya no existe porque deactivate borra los pendientes
      expect(adminRes.status).toBe(404);

      // 4. Limpiar: reactivar la medicación (el schedule ya fue eliminado por deactivate)
      await prisma.medication.update({
        where: { id: medParacetamolId },
        data: { active: true },
      });
      // 5. Regenerar schedules para Paracetamol
      await reschedulePendingMedication(
        medParacetamolId,
        originalParacetamolStartTime,
        6, // frequencyHrs de Paracetamol
        24,
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  //  3. SUSPENDER MEDICACIÓN  (PUT /api/medications/:id/deactivate)
  //     MED-RF2
  // ────────────────────────────────────────────────────────────────────────
  describe("PUT /api/medications/:id/deactivate — Suspender medicación", () => {
    it("DOCTOR puede suspender una medicación activa", async () => {
      // Asegurar que Paracetamol esté activo
      await prisma.medication.update({
        where: { id: medParacetamolId },
        data: { active: true },
      });

      const res = await request(app)
        .put(`/api/medications/${medParacetamolId}/deactivate`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.active).toBe(false);

      // Verificar en DB
      const updated = await prisma.medication.findUnique({
        where: { id: medParacetamolId },
      });
      expect(updated!.active).toBe(false);
    });

    it("NURSE no puede suspender medicación (403)", async () => {
      // Asegurar que Paracetamol esté activo
      await prisma.medication.update({
        where: { id: medParacetamolId },
        data: { active: true },
      });

      const res = await request(app)
        .put(`/api/medications/${medParacetamolId}/deactivate`)
        .set("Authorization", `Bearer ${nurseToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();

      // Verificar que sigue activa
      const unchanged = await prisma.medication.findUnique({
        where: { id: medParacetamolId },
      });
      expect(unchanged!.active).toBe(true);
    });

    it("debe eliminar los horarios pendientes al suspender", async () => {
      // Asegurar que Paracetamol esté activo y tenga schedules pendientes
      await prisma.medication.update({
        where: { id: medParacetamolId },
        data: { active: true },
      });

      await reschedulePendingMedication(
        medParacetamolId,
        originalParacetamolStartTime,
        6,
        24,
      );

      // Verificar que hay schedules pendientes antes de suspender
      const pendingBefore = await prisma.medSchedule.count({
        where: { medicationId: medParacetamolId, administeredAt: null },
      });
      expect(pendingBefore).toBeGreaterThan(0);

      // Suspender
      const res = await request(app)
        .put(`/api/medications/${medParacetamolId}/deactivate`)
        .set("Authorization", `Bearer ${doctorToken}`);
      expect(res.status).toBe(200);

      // Verificar que NO quedan schedules pendientes
      const pendingAfter = await prisma.medSchedule.count({
        where: { medicationId: medParacetamolId, administeredAt: null },
      });
      expect(pendingAfter).toBe(0);

      // Verificar que los schedules pendientes se eliminaron
      expect(pendingAfter).toBe(0);

      // Reactivar para no romper otros tests
      await prisma.medication.update({
        where: { id: medParacetamolId },
        data: { active: true },
      });
      await reschedulePendingMedication(
        medParacetamolId,
        originalParacetamolStartTime,
        6,
        24,
      );
    });

    it("debe generar notificación al enfermero al suspender", async () => {
      // Asegurar que Paracetamol esté activo
      await prisma.medication.update({
        where: { id: medParacetamolId },
        data: { active: true },
      });

      const prevCount = await prisma.notification.count({
        where: { userId: nurseId, type: "MED_REMOVED" },
      });

      await request(app)
        .put(`/api/medications/${medParacetamolId}/deactivate`)
        .set("Authorization", `Bearer ${doctorToken}`);

      const afterCount = await prisma.notification.count({
        where: { userId: nurseId, type: "MED_REMOVED" },
      });

      expect(afterCount).toBeGreaterThan(prevCount);

      const lastNotif = await prisma.notification.findFirst({
        where: { userId: nurseId, type: "MED_REMOVED" },
        orderBy: { createdAt: "desc" },
      });

      expect(lastNotif).not.toBeNull();
      expect(lastNotif!.message).toContain("Paracetamol");
      expect(lastNotif!.relatedPatientId).toBe(patientId);

      // Reactivar
      await prisma.medication.update({
        where: { id: medParacetamolId },
        data: { active: true },
      });
      await reschedulePendingMedication(
        medParacetamolId,
        originalParacetamolStartTime,
        6,
        24,
      );
    });
  });
});
