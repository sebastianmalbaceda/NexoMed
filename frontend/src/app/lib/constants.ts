import type { Role } from './types';

export const ROLES = {
  NURSE: 'NURSE',
  DOCTOR: 'DOCTOR',
  TCAE: 'TCAE',
} as const satisfies Record<string, Role>;

export const ROLE_LABELS: Record<Role, string> = {
  NURSE: 'Enfermero/a',
  DOCTOR: 'Médico/a',
  TCAE: 'TCAE',
};

export const POLLING_INTERVAL_MS = 5_000;

export const SHIFT_HOURS = {
  morning:   { start: 7,  end: 15, label: 'Mañana',  emoji: '🌅' },
  afternoon: { start: 15, end: 23, label: 'Tarde',   emoji: '🌆' },
  night:     { start: 23, end: 7,  label: 'Noche',   emoji: '🌙' },
} as const;

export function getCurrentShift(): { label: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 15)  return SHIFT_HOURS.morning;
  if (hour >= 15 && hour < 23) return SHIFT_HOURS.afternoon;
  return SHIFT_HOURS.night;
}

/** Seed quick-login credentials (matches backend seed.ts) */
export const SEED_CREDENTIALS = [
  { label: 'Dr. García',    role: 'DOCTOR' as Role, email: 'dr.garcia@nexomed.es',      password: 'password123' },
  { label: 'Enf. Martínez', role: 'NURSE' as Role,  email: 'enf.martinez@nexomed.es',   password: 'password123' },
  { label: 'Enf. Gómez',    role: 'NURSE' as Role,  email: 'enf.gomez@nexomed.es',      password: 'password123' },
  { label: 'Enf. López',    role: 'NURSE' as Role,  email: 'enf.lopez@nexomed.es',      password: 'password123' },
  { label: 'Enf. Vera',     role: 'NURSE' as Role,  email: 'enf.vera@nexomed.es',       password: 'password123' },
  { label: 'Enf. Ruiz',     role: 'NURSE' as Role,  email: 'enf.ruiz@nexomed.es',       password: 'password123' },
  { label: 'TCAE Sánchez',  role: 'TCAE'  as Role,  email: 'tcae.sanchez@nexomed.es',   password: 'password123' },
  { label: 'TCAE Expósito', role: 'TCAE'  as Role,  email: 'tcae.exposito@nexomed.es',  password: 'password123' },
] as const;

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  MED_NEW:       'Nueva medicación',
  MED_CHANGE:    'Cambio de medicación',
  MED_REMOVED:   'Medicación retirada',
  INCIDENT_NEW:  'Nueva incidencia',
  TEST_REQUESTED: 'Prueba solicitada',
  TEST_REVIEWED:  'Prueba revisada',
};

export const CARE_RECORD_TYPE_LABELS: Record<string, string> = {
  constante: 'Constante vital',
  cura:      'Cura',
  higiene:   'Higiene',
  balance:   'Balance hídrico',
  ingesta:   'Ingesta',
};
