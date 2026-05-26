// src/services/medication.service.ts
import { prisma } from '../lib/prismaClient';

export async function generateSchedulesForMedication(
  medicationId: string,
  startTime: Date,
  frequencyHrs: number,
  hoursToCover: number = 24,
  endDate?: Date | null,
) {
  if (!frequencyHrs || frequencyHrs <= 0) {
    throw new Error('Frecuencia inválida: debe ser mayor que 0');
  }

  const schedules = [];
  const rawEnd = new Date(startTime.getTime() + hoursToCover * 60 * 60 * 1000);
  const endTime = endDate && endDate < rawEnd ? endDate : rawEnd;
  let current = new Date(startTime);

  while (current < endTime) {
    schedules.push({
      medicationId,
      scheduledAt: new Date(current),
    });
    current = new Date(current.getTime() + frequencyHrs * 60 * 60 * 1000);
  }

  if (schedules.length > 0) {
    await prisma.medSchedule.createMany({ data: schedules });
  }

  return schedules;
}

// Ensures that pending schedules exist for the next 72 hours (or up to minWindowEnd,
// whichever is later). Called on GET /medications and GET /schedule so the schedule
// view always has entries for any requested day, not just the next 72h.
// Respects endDate: no schedules are generated past it.
export async function ensureSchedulesForPeriod(
  medicationId: string,
  startTime: Date,
  frequencyHrs: number,
  endDate?: Date | null,
  minWindowEnd?: Date,
) {
  if (!frequencyHrs || frequencyHrs <= 0) return;

  const now = new Date();
  const lookback = new Date(now.getTime() - frequencyHrs * 3_600_000);
  const base72h = new Date(now.getTime() + 72 * 3_600_000);
  const rawWindowEnd = minWindowEnd && minWindowEnd > base72h ? minWindowEnd : base72h;
  const windowEnd = endDate && endDate < rawWindowEnd ? endDate : rawWindowEnd;

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
  endDate?: Date | null,
) {
  if (!frequencyHrs || frequencyHrs <= 0) {
    throw new Error('Frecuencia inválida: debe ser mayor que 0');
  }

  const now = new Date();

  await prisma.medSchedule.deleteMany({
    where: {
      medicationId,
      administeredAt: null,
      scheduledAt: { gte: now },
    },
  });

  await ensureSchedulesForPeriod(medicationId, newStartTime, frequencyHrs, endDate);
}
