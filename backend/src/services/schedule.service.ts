import { prisma } from '../lib/prismaClient';
import type { GetScheduleQuery, ShiftKey } from '../validations/schedule.validation';
import { ensureSchedulesForPeriod } from './medication.service';

type DateRange = { start: Date; end: Date };

const SHIFT_RANGES: Record<ShiftKey, { startHour: number; endHour: number }> = {
  morning: { startHour: 7, endHour: 15 },
  afternoon: { startHour: 15, endHour: 23 },
  night: { startHour: 23, endHour: 7 },
};

const CARE_TYPE_LABELS: Record<string, string> = {
  constante: 'Constante vital',
  cura: 'Cura',
  higiene: 'Higiene',
  balance: 'Balance hídrico',
  ingesta: 'Ingesta',
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function buildDayRange(dateInput?: string): DateRange {
  const baseDate = dateInput ? new Date(`${dateInput}T00:00:00.000Z`) : startOfUtcDay(new Date());
  const start = startOfUtcDay(baseDate);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);
  return { start, end };
}

function buildShiftRange(dayRange: DateRange, shift: ShiftKey): DateRange {
  const { startHour, endHour } = SHIFT_RANGES[shift];
  const start = new Date(dayRange.start);
  start.setUTCHours(startHour, 0, 0, 0);

  const end = new Date(dayRange.start);
  if (shift === 'night') {
    end.setUTCDate(end.getUTCDate() + 1);
  }
  end.setUTCHours(endHour, 0, 0, 0);
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);

  return { start, end };
}

function roomLabel(bed: { room: number; letter: string } | null) {
  return bed ? `${bed.room}${bed.letter}` : null;
}

function formatMedicationStatus(scheduledAt: Date, administeredAt: Date | null, now: Date) {
  if (administeredAt) {
    return 'completed';
  }

  return scheduledAt.getTime() < now.getTime() ? 'delayed' : 'pending';
}

export async function getScheduleItems(query: GetScheduleQuery) {
  const dayRange = buildDayRange(query.date);
  const range = query.shift ? buildShiftRange(dayRange, query.shift) : dayRange;
  const now = new Date();

  // Ensure DB has up-to-date schedules for all active medications in this query,
  // so the shift schedule page shows current doses even without loading NursePage first.
  const activeMeds = await prisma.medication.findMany({
    where: {
      active: true,
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.nurseId ? { patient: { assignedNurseId: query.nurseId } } : {}),
    },
    select: { id: true, startTime: true, frequencyHrs: true },
  });
  await Promise.all(
    activeMeds.map((med) => ensureSchedulesForPeriod(med.id, med.startTime, med.frequencyHrs))
  );

  // SYS-RF5: el filtro nurseId limita las tareas a pacientes asignados a ese enfermero.
  const patientFilter =
    query.patientId || query.nurseId
      ? {
          ...(query.patientId ? { patientId: query.patientId } : {}),
          ...(query.nurseId ? { patient: { assignedNurseId: query.nurseId } } : {}),
        }
      : undefined;

  const medicationSchedules = await prisma.medSchedule.findMany({
    where: {
      scheduledAt: { gte: range.start, lte: range.end },
      medication: {
        active: true,
        ...(query.patientId || query.nurseId
          ? {
              ...(query.patientId ? { patientId: query.patientId } : {}),
              ...(query.nurseId ? { patient: { assignedNurseId: query.nurseId } } : {}),
            }
          : {}),
      },
    },
    orderBy: { scheduledAt: 'asc' },
    include: {
      medication: {
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              assignedNurseId: true,
              bed: { select: { room: true, letter: true } },
            },
          },
        },
      },
      administeredBy: { select: { id: true, name: true, role: true } },
    },
  });

  const careRecords = await prisma.careRecord.findMany({
    where: {
      recordedAt: { gte: range.start, lte: range.end },
      ...(patientFilter ?? {}),
    },
    orderBy: { recordedAt: 'asc' },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          assignedNurseId: true,
          bed: { select: { room: true, letter: true } },
        },
      },
      recordedBy: { select: { id: true, name: true, role: true } },
    },
  });

  const medicationItems = medicationSchedules.map((schedule) => ({
    id: schedule.id,
    source: 'MEDICATION',
    type: 'medication',
    timestamp: schedule.scheduledAt.toISOString(),
    status: formatMedicationStatus(schedule.scheduledAt, schedule.administeredAt, now),
    patientId: schedule.medication.patient.id,
    patientName: schedule.medication.patient.name,
    assignedNurseId: schedule.medication.patient.assignedNurseId,
    room: roomLabel(schedule.medication.patient.bed),
    title: schedule.medication.drugName,
    details: `${schedule.medication.dose} · ${schedule.medication.route} · cada ${schedule.medication.frequencyHrs}h`,
    scheduledAt: schedule.scheduledAt,
    administeredAt: schedule.administeredAt,
    completedBy: schedule.administeredBy,
    metadata: {
      medicationId: schedule.medicationId,
      frequencyHrs: schedule.medication.frequencyHrs,
      route: schedule.medication.route,
      dose: schedule.medication.dose,
    },
  }));

  const careItems = careRecords.map((record) => ({
    id: record.id,
    source: 'CARE_RECORD',
    type: 'care-record',
    timestamp: record.recordedAt.toISOString(),
    status: 'completed',
    patientId: record.patient.id,
    patientName: record.patient.name,
    assignedNurseId: record.patient.assignedNurseId,
    room: roomLabel(record.patient.bed),
    title: CARE_TYPE_LABELS[record.type] ?? record.type,
    details: [record.value, record.unit, record.notes].filter(Boolean).join(' · '),
    recordedAt: record.recordedAt,
    completedBy: record.recordedBy,
    metadata: {
      careRecordType: record.type,
      value: record.value,
      unit: record.unit,
      notes: record.notes,
    },
  }));

  const diagnosticTests = await prisma.diagnosticTest.findMany({
    where: {
      scheduledAt: { gte: range.start, lte: range.end },
      status: { in: ['APPROVED', 'COMPLETED'] },
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.nurseId ? { patient: { assignedNurseId: query.nurseId } } : {}),
    },
    orderBy: { scheduledAt: 'asc' },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          assignedNurseId: true,
          bed: { select: { room: true, letter: true } },
        },
      },
      requestedBy: { select: { id: true, name: true } },
    },
  });

  const testItems = diagnosticTests.map((test) => ({
    id: test.id,
    source: 'DIAGNOSTIC_TEST',
    type: 'diagnostic-test',
    timestamp: test.scheduledAt.toISOString(),
    status: (test.status === 'COMPLETED' || test.status === 'CANCELLED'
      ? 'completed'
      : test.scheduledAt < now ? 'delayed' : 'pending') as 'completed' | 'delayed' | 'pending',
    patientId: test.patient.id,
    patientName: test.patient.name,
    assignedNurseId: test.patient.assignedNurseId,
    room: roomLabel(test.patient.bed),
    title: test.name,
    details: `${test.type === 'LAB' ? 'Laboratorio' : 'Diagnóstico por imagen'} · Solicitado por ${test.requestedBy.name}`,
    metadata: { testType: test.type, result: test.result },
  }));

  return [...medicationItems, ...careItems, ...testItems].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
