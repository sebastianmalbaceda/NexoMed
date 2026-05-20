// src/controllers/notifications.controller.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prismaClient';
import { AuthRequest } from '../middlewares/auth.middleware';
import { handlePrismaError } from '../lib/errorHandler';
import { notificationBus, NotificationEvent } from '../lib/notificationEvents';

// GET /api/notifications — notificaciones del usuario autenticado
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            surnames: true,
            bed: { select: { room: true, letter: true } }
          }
        }
      }
    });

    // Add senderName, patientName and patientBed to response
    const enriched = notifications.map(n => {
      const patientName = n.patient
        ? `${n.patient.name} ${n.patient.surnames ?? ''}`.trim()
        : null;
      const patientBed = n.patient?.bed
        ? `Hab. ${n.patient.bed.room}${n.patient.bed.letter}`
        : null;
      return {
        ...n,
        patientName,
        patientBed,
        senderName: n.message.includes('por ') ? n.message.split('por ')[1]?.trim() : undefined,
      };
    });
    res.json(enriched);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// PUT /api/notifications/:id/read — marcar como leída
export const markAsRead = async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    const notification = await prisma.notification.update({
      where: { id, userId: req.user!.id },
      data: { read: true }
    });
    res.json(notification);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// PUT /api/notifications/read-all — marcar todas como leídas
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true }
    });
    res.json({ ok: true });
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// GET /api/notifications/stream — SSE en tiempo real (ENF-RF3)
// EventSource no soporta headers personalizados, así que el token llega por query (?token=)
export const streamNotifications = (req: Request, res: Response) => {
  const token = (req.query.token as string | undefined) ?? '';
  if (!token) {
    res.status(401).end();
    return;
  }

  let userId: string;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string };
    userId = decoded.id;
  } catch {
    res.status(401).end();
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Mensaje inicial para confirmar la conexión y forzar flush
  res.write(`retry: 5000\n\n`);
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, userId })}\n\n`);
  console.log(`[SSE] Cliente conectado: userId=${userId}`);

  const onEvent = (evt: NotificationEvent) => {
    if (evt.userId !== userId) return;
    res.write(`event: notification\ndata: ${JSON.stringify(evt)}\n\n`);
  };
  notificationBus.on('notification', onEvent);

  // Keepalive cada 20s para evitar timeouts de proxies
  const keepalive = setInterval(() => {
    res.write(`: keepalive ${Date.now()}\n\n`);
  }, 20_000);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clearInterval(keepalive);
    notificationBus.off('notification', onEvent);
    console.log(`[SSE] Cliente desconectado: userId=${userId}`);
  };
  req.on('close', cleanup);
  req.on('aborted', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
};
