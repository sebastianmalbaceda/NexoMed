// src/lib/notificationEvents.ts
// EventEmitter global para empujar notificaciones por SSE en tiempo real (ENF-RF3)
import { EventEmitter } from 'events';

export interface NotificationEvent {
  userId: string;
  type: string;
  message: string;
  relatedPatientId: string | null;
  patientName: string | null;
  patientBed: string | null;
  createdAt: string;
}

class NotificationBus extends EventEmitter {}

export const notificationBus = new NotificationBus();
// Permitir muchos suscriptores (un listener por conexión SSE activa)
notificationBus.setMaxListeners(0);
