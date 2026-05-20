// src/services/notification.service.ts
import { prisma } from '../lib/prismaClient';
import { notificationBus } from '../lib/notificationEvents';
import { AuthRequest } from '../middlewares/auth.middleware';

async function getPatientInfo(patientId: string): Promise<{ patientName: string | null; patientBed: string | null }> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      name: true,
      surnames: true,
      bed: { select: { room: true, letter: true } },
    },
  });
  if (!patient) return { patientName: null, patientBed: null };
  const patientName = `${patient.name} ${patient.surnames ?? ''}`.trim() || null;
  const patientBed = patient.bed ? `Hab. ${patient.bed.room}${patient.bed.letter}` : null;
  return { patientName, patientBed };
}

export async function notifyNursesAboutMedicationChange(
  patientId: string,
  type: string,
  message: string,
  senderName?: string
) {
  const patientInfo = await getPatientInfo(patientId);

  // Find the assigned nurse for this patient (if any)
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { assignedNurseId: true }
  });

  // If no nurse is assigned, notify ALL nurses as fallback
  const nurses = patient?.assignedNurseId
    ? [await prisma.user.findUnique({ where: { id: patient.assignedNurseId } })]
    : await prisma.user.findMany({ where: { role: 'NURSE' } });

  const validNurses = nurses.filter((n): n is NonNullable<typeof n> => n !== null);

  if (validNurses.length === 0) {
    console.warn('[notifications] No hay enfermeros a quien notificar');
    return;
  }

  const notifications = validNurses.map(nurse => ({
    userId: nurse.id,
    type,
    message,
    relatedPatientId: patientId
  }));

  // Insertar primero, luego emitir eventos SSE
  await prisma.notification.createMany({ data: notifications });

  const createdAt = new Date().toISOString();
  for (const nurse of validNurses) {
    notificationBus.emit('notification', {
      userId: nurse.id,
      type,
      message,
      relatedPatientId: patientId,
      patientName: patientInfo.patientName,
      patientBed: patientInfo.patientBed,
      createdAt,
      senderName,
    });
  }
  console.log(`[notifications] ${type} → ${validNurses.length} enfermero(s) notificado(s)`);
}

export async function notifyNursesAboutDiagnosticTest(
  patientId: string,
  type: string,
  message: string,
  senderName?: string
) {
  const patientInfo = await getPatientInfo(patientId);

  const nurses = await prisma.user.findMany({
    where: { role: 'NURSE' }
  });

  if (nurses.length === 0) {
    console.warn('[notifications] No hay enfermeros a quien notificar');
    return;
  }

  const notifications = nurses.map(nurse => ({
    userId: nurse.id,
    type,
    message,
    relatedPatientId: patientId
  }));

  await prisma.notification.createMany({ data: notifications });

  const createdAt = new Date().toISOString();
  for (const nurse of nurses) {
    notificationBus.emit('notification', {
      userId: nurse.id,
      type,
      message,
      relatedPatientId: patientId,
      patientName: patientInfo.patientName,
      patientBed: patientInfo.patientBed,
      createdAt,
      senderName,
    });
  }
  console.log(`[notifications] ${type} → ${nurses.length} enfermeros notificados`);
}

export async function notifyNursesAboutIncident(
  patientId: string,
  type: string,
  message: string,
  senderName?: string
) {
  const patientInfo = await getPatientInfo(patientId);

  const nurses = await prisma.user.findMany({
    where: { role: 'NURSE' }
  });

  if (nurses.length === 0) {
    console.warn('[notifications] No hay enfermeros a quien notificar');
    return;
  }

  const notifications = nurses.map(nurse => ({
    userId: nurse.id,
    type,
    message,
    relatedPatientId: patientId
  }));

  await prisma.notification.createMany({ data: notifications });

  const createdAt = new Date().toISOString();
  for (const nurse of nurses) {
    notificationBus.emit('notification', {
      userId: nurse.id,
      type,
      message,
      relatedPatientId: patientId,
      patientName: patientInfo.patientName,
      patientBed: patientInfo.patientBed,
      createdAt,
      senderName,
    });
  }
  console.log(`[notifications] ${type} → ${nurses.length} enfermeros notificados`);
}
