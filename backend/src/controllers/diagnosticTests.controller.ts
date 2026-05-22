// src/controllers/diagnosticTests.controller.ts
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prismaClient';
import { AuthRequest } from '../middlewares/auth.middleware';
import { createDiagnosticTestSchema, updateTestResultSchema, updateDiagnosticTestSchema, updateTestStatusSchema } from '../validations/diagnosticTest.validation';
import { handlePrismaError } from '../lib/errorHandler';
import { notifyNursesAboutDiagnosticTest } from '../services/notification.service';
import { notificationBus } from '../lib/notificationEvents';

type DiagnosticTestsQuery = {
  patientId?: string;
  type?: string;
  status?: string;
  date?: string;
};

function getDiagnosticTestDayRange(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  return { start, end };
}

function serializeDiagnosticTest(test: {
  id: string;
  patientId: string;
  type: string;
  name: string;
  scheduledAt: Date;
  result: string | null;
  status: string;
  createdAt?: Date;
  requestedBy?: { name: string; role: string };
  reviewedBy?: { name: string; role: string } | null;
  patient?: {
    id: string;
    name: string;
    bed: { room: number; letter: string } | null;
  };
}) {
  return {
    ...test,
    requestedBy: test.requestedBy?.name,
    reviewedBy: test.reviewedBy?.name ?? null,
  };
}

function buildDiagnosticTestsWhere(query: DiagnosticTestsQuery) {
  const where: Prisma.DiagnosticTestWhereInput = {};

  if (query.patientId) {
    where.patientId = query.patientId;
  }

  if (query.type) {
    where.type = query.type;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.date) {
    const { start, end } = getDiagnosticTestDayRange(query.date);
    where.scheduledAt = { gte: start, lte: end };
  }

  return where;
}

// GET /api/tests — vista global de pruebas diagnósticas
export const getAllDiagnosticTests = async (req: AuthRequest, res: Response) => {
  const { patientId, type, status, date } = req.query as DiagnosticTestsQuery;

  try {
    const tests = await prisma.diagnosticTest.findMany({
      where: buildDiagnosticTestsWhere({ patientId, type, status, date }),
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      take: 500,
      include: {
        requestedBy: { select: { name: true, role: true } },
        patient: {
          select: {
            id: true,
            name: true,
            bed: { select: { room: true, letter: true } },
          },
        },
      },
    });

    res.json(tests.map(serializeDiagnosticTest));
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// GET /api/tests/:patientId — pruebas diagnósticas de un paciente
export const getDiagnosticTests = async (req: AuthRequest, res: Response) => {
  const { patientId } = req.params as { patientId: string };
  try {
    const tests = await prisma.diagnosticTest.findMany({
      where: { patientId },
      orderBy: { scheduledAt: 'desc' },
      take: 500,
      include: {
        requestedBy: { select: { name: true, role: true } },
        patient: {
          select: {
            id: true,
            name: true,
            bed: { select: { room: true, letter: true } },
          },
        },
      }
    });
    res.json(tests.map(serializeDiagnosticTest));
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// POST /api/tests — solicitar prueba diagnóstica (DOCTOR y NURSE)
export const createDiagnosticTest = async (req: AuthRequest, res: Response) => {
  const validation = createDiagnosticTestSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0].message });
  }

  const { patientId, type, name, scheduledAt } = validation.data;
  try {
    // Doctors' tests are pre-approved; only nurse requests need doctor review
    const initialStatus = req.user!.role === 'DOCTOR' ? 'APPROVED' : 'REQUESTED';
    const test = await prisma.diagnosticTest.create({
      data: {
        patientId,
        type,
        name,
        scheduledAt: new Date(scheduledAt),
        requestedById: req.user!.id,
        status: initialStatus,
      }
    });

    // Notificar al médico si quien solicita es enfermera
    if (req.user!.role === 'NURSE') {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { name: true, surnames: true, bed: { select: { room: true, letter: true } } }
      });
      const patientName = patient ? `${patient.name} ${patient.surnames ?? ''}`.trim() : null;
      const patientBed = patient?.bed ? `Hab. ${patient.bed.room}${patient.bed.letter}` : null;
      const doctors = await prisma.user.findMany({ where: { role: 'DOCTOR' } });
      const message = `${req.user!.name} solicita ${name} para ${patient?.name ?? 'el paciente'}`;
      const createdAt = new Date().toISOString();

      for (const doctor of doctors) {
        const notif = await prisma.notification.create({
          data: {
            userId: doctor.id,
            type: 'TEST_REQUESTED',
            message,
            relatedPatientId: patientId,
          }
        });
        notificationBus.emit('notification', {
          id: notif.id,
          userId: doctor.id,
          type: 'TEST_REQUESTED',
          message,
          relatedPatientId: patientId,
          patientName,
          patientBed,
          createdAt,
          senderName: req.user!.name,
        });
      }
    } else {
      // Notificar a enfermeras si quien solicita es médico
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      const typeLabel = type === 'LAB' ? 'Laboratorio' : 'Diagnóstico por imagen';
      await notifyNursesAboutDiagnosticTest(
        patientId,
        'TEST_NEW',
        `Nueva prueba de ${typeLabel} programada para ${patient?.name ?? 'paciente'}: ${name}`,
        req.user!.name
      );
    }

    res.status(201).json(test);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// PUT /api/tests/:id/status — cambiar estado (DOCTOR)
export const updateTestStatus = async (req: AuthRequest, res: Response) => {
  const validation = updateTestStatusSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0].message });
  }

  const { id } = req.params as { id: string };
  const { status } = validation.data;

  try {
    const test = await prisma.diagnosticTest.update({
      where: { id },
      data: {
        status,
      },
      include: {
        requestedBy: { select: { id: true, name: true } },
        patient: { select: { name: true } },
      },
    });

    // Notificar a quien solicitó la prueba
    if (test.requestedById !== req.user!.id) {
      const patientInfo = await prisma.patient.findUnique({
        where: { id: test.patientId },
        select: { name: true, surnames: true, bed: { select: { room: true, letter: true } } },
      });
      const patientName = patientInfo ? `${patientInfo.name} ${patientInfo.surnames ?? ''}`.trim() : null;
      const patientBed = patientInfo?.bed ? `Hab. ${patientInfo.bed.room}${patientInfo.bed.letter}` : null;
      const statusLabel = status === 'APPROVED' ? 'aprobada' : status === 'REJECTED' ? 'rechazada' : 'completada';
      const message = `Tu prueba "${test.name}" ha sido ${statusLabel} por ${req.user!.name}`;
      const createdAt = new Date().toISOString();

      const notif = await prisma.notification.create({
        data: {
          userId: test.requestedById,
          type: 'TEST_REVIEWED',
          message,
          relatedPatientId: test.patientId,
        }
      });
      notificationBus.emit('notification', {
        id: notif.id,
        userId: test.requestedById,
        type: 'TEST_REVIEWED',
        message,
        relatedPatientId: test.patientId,
        patientName,
        patientBed,
        createdAt,
        senderName: req.user!.name,
      });
    }

    res.json(test);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// DELETE /api/tests/:id — eliminar prueba (DOCTOR)
export const deleteDiagnosticTest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    await prisma.diagnosticTest.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// PUT /api/tests/:id/result — registrar resultado
export const addTestResult = async (req: AuthRequest, res: Response) => {
  const validation = updateTestResultSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0].message });
  }

  const { id } = req.params as { id: string };
  const { result } = validation.data;
  try {
    const test = await prisma.diagnosticTest.update({
      where: { id },
      data: { result, status: 'COMPLETED' }
    });
    res.json(test);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};
