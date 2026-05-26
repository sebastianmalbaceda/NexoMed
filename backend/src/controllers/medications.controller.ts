// src/controllers/medications.controller.ts
import { Response } from "express";
import { prisma } from "../lib/prismaClient";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  reschedulePendingMedication,
  ensureSchedulesForPeriod,
} from "../services/medication.service";
import { notifyNursesAboutMedicationChange } from "../services/notification.service";
import {
  createMedicationSchema,
  updateMedicationSchema,
  updateScheduleSchema,
} from "../validations/medication.validation";
import { handlePrismaError } from "../lib/errorHandler";

// GET /api/medications/:patientId — medicación activa del paciente
export const getMedications = async (req: AuthRequest, res: Response) => {
  const { patientId } = req.params as { patientId: string };
  try {
    const now = new Date();

    // Auto-deactivate medications that have passed their endDate
    const expired = await prisma.medication.findMany({
      where: {
        patientId,
        active: true,
        endDate: { lt: now },
      },
      select: { id: true },
    });

    if (expired.length > 0) {
      const ids = expired.map((m) => m.id);
      await prisma.$transaction([
        prisma.medSchedule.deleteMany({
          where: { medicationId: { in: ids }, administeredAt: null },
        }),
        prisma.medication.updateMany({
          where: { id: { in: ids } },
          data: { active: false },
        }),
      ]);
    }

    const medications = await prisma.medication.findMany({
      where: { patientId, active: true },
      include: { prescribedBy: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Ensure each active medication has pending schedules for the next 72 h
    await Promise.all(
      medications.map((med) =>
        ensureSchedulesForPeriod(med.id, med.startTime, med.frequencyHrs, med.endDate),
      ),
    );

    // Re-fetch with updated schedules
    const medicationsWithSchedules = await prisma.medication.findMany({
      where: { patientId, active: true },
      include: {
        schedules: {
          orderBy: { scheduledAt: "asc" },
          include: { administeredBy: { select: { name: true } } },
        },
        prescribedBy: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const serialized = medicationsWithSchedules.map((med) => ({
      ...med,
      prescribedById: med.prescribedBy?.name,
      schedules: med.schedules.map((s) => ({
        id: s.id,
        medicationId: s.medicationId,
        scheduledAt: s.scheduledAt,
        administeredAt: s.administeredAt,
        administeredBy: s.administeredBy?.name || null,
      })),
    }));

    res.json(serialized);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// POST /api/medications — prescribir medicación (solo DOCTOR)
export const createMedication = async (req: AuthRequest, res: Response) => {
  const validation = createMedicationSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0].message });
  }

  const {
    patientId,
    drugName,
    nregistro,
    dose,
    route,
    frequencyHrs,
    startTime,
    endDate,
  } = validation.data;

  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { name: true },
    });

    const parsedEnd = endDate ? new Date(endDate) : null;

    const medication = await prisma.$transaction(async (tx) => {
      const med = await tx.medication.create({
        data: {
          patientId,
          drugName,
          nregistro,
          dose,
          route,
          frequencyHrs,
          startTime: new Date(startTime),
          endDate: parsedEnd,
          prescribedById: req.user!.id,
        },
      });

      const schedules = [];
      const rawEnd = new Date(new Date(startTime).getTime() + 72 * 60 * 60 * 1000);
      const endTime = parsedEnd && parsedEnd < rawEnd ? parsedEnd : rawEnd;
      let current = new Date(startTime);

      while (current < endTime) {
        schedules.push({
          medicationId: med.id,
          scheduledAt: new Date(current),
        });
        current = new Date(current.getTime() + frequencyHrs * 60 * 60 * 1000);
      }

      if (schedules.length > 0) {
        await tx.medSchedule.createMany({
          data: schedules,
          skipDuplicates: true,
        });
      }

      return med;
    });

    await notifyNursesAboutMedicationChange(
      patientId,
      "MED_NEW",
      `Nueva medicación prescrita para ${patient?.name ?? "el paciente"}: ${drugName} ${dose}`,
      req.user!.name,
    );

    res.status(201).json(medication);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// PUT /api/medications/:id — editar medicación completa (solo DOCTOR)
export const updateMedication = async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };

  const validation = updateMedicationSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0].message });
  }

  const { drugName, nregistro, dose, route, frequencyHrs, startTime, endDate } = validation.data;

  try {
    const medication = await prisma.medication.findUnique({
      where: { id },
      include: { patient: { select: { name: true, id: true } } },
    });

    if (!medication) {
      return res.status(404).json({ error: "Medicación no encontrada" });
    }
    if (!medication.active) {
      return res.status(409).json({ error: "No se puede editar una medicación suspendida" });
    }

    const parsedStart = new Date(startTime);
    const parsedEnd = endDate ? new Date(endDate) : null;

    // Use the exact administeredAt of the last administered dose as the schedule
    // anchor. The form sends startTime rounded to minutes, which would cause a
    // phantom duplicate alongside the already-administered entry at full precision.
    const lastAdministered = await prisma.medSchedule.findFirst({
      where: { medicationId: id, administeredAt: { not: null } },
      orderBy: { administeredAt: "desc" },
      select: { administeredAt: true },
    });
    const anchor = lastAdministered?.administeredAt ?? parsedStart;

    await prisma.$transaction(async (tx) => {
      await tx.medSchedule.deleteMany({
        where: { medicationId: id, administeredAt: null },
      });

      await tx.medication.update({
        where: { id },
        data: { drugName, nregistro, dose, route, frequencyHrs, startTime: anchor, endDate: parsedEnd },
      });
    });

    // Start generating from anchor + frequencyHrs so no slot lands on the
    // already-administered dose and there are no duplicates.
    const nextStart = new Date(anchor.getTime() + frequencyHrs * 3_600_000);
    await ensureSchedulesForPeriod(id, nextStart, frequencyHrs, parsedEnd);

    await notifyNursesAboutMedicationChange(
      medication.patientId,
      "MED_CHANGE",
      `Medicación actualizada para ${medication.patient?.name ?? "el paciente"}: ${drugName} ${dose}`,
      req.user!.name,
    );

    res.json({ message: "Medicación actualizada correctamente" });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// PUT /api/medications/:id/deactivate — suspender medicación (solo DOCTOR)
export const deactivateMedication = async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    const medication = await prisma.medication.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!medication) {
      return res.status(404).json({ error: "Medicación no encontrada" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.medSchedule.deleteMany({
        where: {
          medicationId: id,
          administeredAt: null,
        },
      });

      return tx.medication.update({
        where: { id },
        data: { active: false },
      });
    });

    await notifyNursesAboutMedicationChange(
      medication.patientId,
      "MED_REMOVED",
      `Medicación retirada para ${medication.patient.name}: ${medication.drugName}`,
      req.user!.name,
    );

    res.json(updated);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// PUT /api/medications/:id/schedule — cambiar hora de inicio (solo hora, mantiene frecuencia)
export const updateMedicationSchedule = async (
  req: AuthRequest,
  res: Response,
) => {
  const { id } = req.params as { id: string };

  const validation = updateScheduleSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0].message });
  }

  const { newStartTime } = validation.data;

  try {
    const medication = await prisma.medication.findUnique({
      where: { id },
      include: { patient: { select: { name: true } } },
    });

    if (!medication) {
      return res.status(404).json({ error: "Medicación no encontrada" });
    }

    const parsedNewStart = new Date(newStartTime);

    await reschedulePendingMedication(
      medication.id,
      parsedNewStart,
      medication.frequencyHrs,
      medication.endDate,
    );

    await prisma.medication.update({
      where: { id },
      data: { startTime: parsedNewStart },
    });

    // Regenerate schedules for the next 72 h with the new start time
    await ensureSchedulesForPeriod(medication.id, parsedNewStart, medication.frequencyHrs, medication.endDate);

    await notifyNursesAboutMedicationChange(
      medication.patientId,
      "MED_CHANGE",
      `Horario de medicación cambiado para ${medication.patient?.name ?? "el paciente"}: ${medication.drugName}`,
      req.user!.name,
    );

    res.json({ message: "Horario cambiado correctamente" });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// POST /api/medications/schedules/:scheduleId/administer — marcar dosis como administrada
export const administerSchedule = async (req: AuthRequest, res: Response) => {
  const { scheduleId } = req.params as { scheduleId: string };
  try {
    const schedule = await prisma.medSchedule.findUnique({
      where: { id: scheduleId },
      include: { medication: true },
    });

    if (!schedule) {
      return res.status(404).json({ error: "Horario no encontrado" });
    }

    if (!schedule.medication.active) {
      return res.status(409).json({ error: "La medicación está suspendida" });
    }

    if (schedule.administeredAt) {
      return res
        .status(409)
        .json({ error: "Esta dosis ya ha sido administrada" });
    }

    const now = new Date();
    const scheduledDate = new Date(schedule.scheduledAt);

    // Allow administering doses from the last 24 h or up to 1 h ahead.
    // A strict shift-range check is avoided here because the server runs in UTC
    // while nurses use local time (UTC+2 in Spain), causing spurious rejections.
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAhead = new Date(now.getTime() + 60 * 60 * 1000);
    if (scheduledDate < oneDayAgo || scheduledDate > oneHourAhead) {
      return res.status(403).json({
        error: "Solo puedes administrar medicación del día actual (no más de 1 h en el futuro).",
      });
    }

    const administeredAt = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.medSchedule.update({
        where: { id: scheduleId },
        data: {
          scheduledAt: administeredAt,
          administeredAt,
          administeredById: req.user!.id,
        },
      });

      // Remove every pending schedule for this medication except the one just
      // administered, so the slate is clean before recalculation.
      await tx.medSchedule.deleteMany({
        where: {
          medicationId: schedule.medication.id,
          administeredAt: null,
          id: { not: scheduleId },
        },
      });

      // Shift the medication anchor so GET /medications doesn't regenerate
      // schedules at the old fixed times (which would cause duplicates).
      await tx.medication.update({
        where: { id: schedule.medication.id },
        data: { startTime: administeredAt },
      });

      return result;
    });

    // Generate new pending schedules anchored to the actual administration time.
    const nextStart = new Date(administeredAt.getTime() + schedule.medication.frequencyHrs * 3_600_000);
    await ensureSchedulesForPeriod(
      schedule.medication.id,
      nextStart,
      schedule.medication.frequencyHrs,
      schedule.medication.endDate,
    );

    res.json(updated);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};
