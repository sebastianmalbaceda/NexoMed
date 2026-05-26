// src/controllers/medications.controller.ts
import { Response } from "express";
import { prisma } from "../lib/prismaClient";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  generateSchedulesForMedication,
  reschedulePendingMedication,
  ensureSchedulesForPeriod,
} from "../services/medication.service";
import { notifyNursesAboutMedicationChange } from "../services/notification.service";
import {
  createMedicationSchema,
  updateScheduleSchema,
} from "../validations/medication.validation";
import { handlePrismaError } from "../lib/errorHandler";

// Returns the [start, end] timestamps of the currently active shift.
// Night shift (23:00–06:59) crosses midnight, so we handle both halves.
function getCurrentShiftRange(now: Date): { start: Date; end: Date } {
  const h = now.getHours();
  const start = new Date(now);
  const end = new Date(now);

  if (h >= 7 && h < 15) {
    start.setHours(7, 0, 0, 0);
    end.setHours(14, 59, 59, 999);
  } else if (h >= 15 && h < 23) {
    start.setHours(15, 0, 0, 0);
    end.setHours(22, 59, 59, 999);
  } else if (h >= 23) {
    // Night, first half: 23:00 today → 06:59 tomorrow
    start.setHours(23, 0, 0, 0);
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(6, 59, 59, 999);
    return { start, end: nextDay };
  } else {
    // Night, second half: 23:00 yesterday → 06:59 today
    const prevDay = new Date(now);
    prevDay.setDate(prevDay.getDate() - 1);
    prevDay.setHours(23, 0, 0, 0);
    end.setHours(6, 59, 59, 999);
    return { start: prevDay, end };
  }
  return { start, end };
}

// Returns the [start, end] of the current calendar day (midnight to midnight).
// Nurses can administer any dose scheduled for today, regardless of shift.
function getCurrentDayRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// GET /api/medications/:patientId — medicación activa del paciente
export const getMedications = async (req: AuthRequest, res: Response) => {
  const { patientId } = req.params as { patientId: string };
  try {
    const medications = await prisma.medication.findMany({
      where: { patientId, active: true },
      include: { prescribedBy: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Ensure each active medication has pending schedules for the next 72 h
    await Promise.all(
      medications.map((med) =>
        ensureSchedulesForPeriod(med.id, med.startTime, med.frequencyHrs),
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
  } = validation.data;
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { name: true },
    });

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
          prescribedById: req.user!.id,
        },
      });

      // Generar horarios dentro de la misma transacción para atomicidad
      const schedules = [];
      const endTime = new Date(
        new Date(startTime).getTime() + 24 * 60 * 60 * 1000,
      );
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
      // Eliminar horarios pendientes de la medicación desactivada
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

// PUT /api/medications/:id/schedule — cambiar hora de inicio de medicación (solo hora, mantiene frecuencia)
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

    await reschedulePendingMedication(
      medication.id,
      new Date(newStartTime),
      medication.frequencyHrs,
      24,
    );

    // Actualizar la hora de inicio en la medicación para que el frontend la refleje correctamente
    await prisma.medication.update({
      where: { id },
      data: { startTime: new Date(newStartTime) },
    });

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

    const now = new Date();
    const scheduledDate = new Date(schedule.scheduledAt);

    // Validate the dose falls within the current calendar day.
    // Nurses can administer any pending dose scheduled for today, regardless of shift.
    const dayRange = getCurrentDayRange(now);
    if (scheduledDate < dayRange.start || scheduledDate > dayRange.end) {
      return res.status(403).json({
        error:
          "Solo puedes administrar medicación programada para el día de hoy.",
      });
    }

    const updated = await prisma.medSchedule.update({
      where: { id: scheduleId },
      data: {
        administeredAt: new Date(),
        administeredById: req.user!.id,
      },
    });
    res.json(updated);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};
