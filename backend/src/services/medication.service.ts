// src/services/medication.service.ts
import { prisma } from '../lib/prismaClient';

export async function generateSchedulesForMedication(
  medicationId: string,
  startTime: Date,
  frequencyHrs: number,
  hoursToCover: number = 24
) {
  if (!frequencyHrs || frequencyHrs <= 0) {
    throw new Error('Frecuencia inválida: debe ser mayor que 0');
  }

  const schedules = [];
  const endTime = new Date(startTime.getTime() + hoursToCover * 60 * 60 * 1000);
  let current = new Date(startTime);

  while (current < endTime) {
    schedules.push({
      medicationId,
      scheduledAt: new Date(current)
    });
    current = new Date(current.getTime() + frequencyHrs * 60 * 60 * 1000);
  }

  if (schedules.length > 0) {
    await prisma.medSchedule.createMany({ data: schedules });
  }

  return schedules;
}

// Ensures that pending schedules exist for the next 72 hours.
// Called on every GET /medications so nurses always see upcoming doses.
export async function ensureSchedulesForPeriod(
  medicationId: string,
  startTime: Date,
  frequencyHrs: number
) {
  if (!frequencyHrs || frequencyHrs <= 0) return;

  const now = new Date();
  // Look back one full period so the current dose is always included,
  // even if its scheduledAt is a few minutes in the past.
  const lookback = new Date(now.getTime() - frequencyHrs * 3_600_000);
  const windowEnd = new Date(now.getTime() + 72 * 3_600_000);

  const existing = await prisma.medSchedule.findMany({
    where: {
      medicationId,
      scheduledAt: { gte: lookback, lte: windowEnd },
    },
    select: { scheduledAt: true },
  });

  const existingTimes = new Set(existing.map((s) => s.scheduledAt.getTime()));

  let nextDose = new Date(startTime);
  while (nextDose < lookback) {
    nextDose = new Date(nextDose.getTime() + frequencyHrs * 3_600_000);
  }

  const schedules: { medicationId: string; scheduledAt: Date }[] = [];
  while (nextDose <= windowEnd) {
    if (!existingTimes.has(nextDose.getTime())) {
      schedules.push({ medicationId, scheduledAt: new Date(nextDose) });
    }
    nextDose = new Date(nextDose.getTime() + frequencyHrs * 3_600_000);
  }

  if (schedules.length > 0) {
    await prisma.medSchedule.createMany({ data: schedules, skipDuplicates: true });
  }
}

export async function reschedulePendingMedication(
  medicationId: string,
  newStartTime: Date,
  frequencyHrs: number,
  hoursToCover: number = 24
) {
  if (!frequencyHrs || frequencyHrs <= 0) {
    throw new Error('Frecuencia inválida: debe ser mayor que 0');
  }

  const schedules: { medicationId: string; scheduledAt: Date }[] = [];
  const endTime = new Date(newStartTime.getTime() + hoursToCover * 60 * 60 * 1000);
  let current = new Date(newStartTime);

  while (current < endTime) {
    schedules.push({
      medicationId,
      scheduledAt: new Date(current)
    });
    current = new Date(current.getTime() + frequencyHrs * 60 * 60 * 1000);
  }

  return prisma.$transaction(async (tx) => {
    // Solo eliminar horarios pendientes del rango que vamos a regenerar
    await tx.medSchedule.deleteMany({
      where: {
        medicationId,
        administeredAt: null,
        scheduledAt: {
          gte: newStartTime,
          lte: endTime,
        },
      }
    });

    if (schedules.length > 0) {
      await tx.medSchedule.createMany({ data: schedules, skipDuplicates: true });
    }

    return schedules;
  });
}
