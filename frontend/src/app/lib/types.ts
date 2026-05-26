// ─── Domain types matching Prisma schema exactly ───────────────────────────

export type Role = 'NURSE' | 'DOCTOR' | 'TCAE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  shift?: 'morning' | 'afternoon' | 'night' | null;
  createdAt: string;
}

export type PatientStatus = 'ESTABLE' | 'MODERADO' | 'CRITICO' | 'OBSERVACION';

export interface Patient {
  id: string;
  dni: string | null;
  name: string;
  surnames: string | null;
  /** ISO date string */
  dob: string;
  diagnosis: string;
  status: PatientStatus;
  allergies: string[];
  dietRestriction: string | null;
  isolationRestriction: string | null;
  mobilityRestriction: string | null;
  /** ISO date string */
  admissionDate: string;
  discharged: boolean;
  /** ISO date string */
  dischargeDate: string | null;
  bedId: string | null;
  bed?: Bed;
  assignedNurseId: string | null;
  assignedNurse?: { id: string; name: string } | null;
}

export interface Bed {
  id: string;
  room: number;
  letter: string;
  floor: number;
  patient?: Patient | null;
}

export interface Medication {
  id: string;
  patientId: string;
  drugName: string;
  nregistro: string | null;
  dose: string;
  route: string;
  frequencyHrs: number;
  /** ISO date string */
  startTime: string;
  /** ISO date string or null (null = indefinite) */
  endDate: string | null;
  active: boolean;
  prescribedById: string;
  /** ISO date string */
  createdAt: string;
  schedules?: MedSchedule[];
}

export interface MedSchedule {
  id: string;
  medicationId: string;
  /** ISO date string */
  scheduledAt: string;
  /** ISO date string or null */
  administeredAt: string | null;
  administeredBy: string | null;
}

export type CareRecordType =
  | 'constante'
  | 'constante_tas'
  | 'constante_tad'
  | 'constante_fc'
  | 'constante_temp'
  | 'constante_spo2'
  | 'cura'
  | 'higiene'
  | 'balance'
  | 'ingesta';

export interface CareRecord {
  id: string;
  patientId: string;
  type: CareRecordType;
  value: string;
  unit: string | null;
  notes: string | null;
  recordedBy: string;
  /** ISO date string */
  recordedAt: string;
}

export type NotificationType =
  | 'MED_CHANGE'
  | 'MED_NEW'
  | 'MED_REMOVED'
  | 'INCIDENT_NEW'
  | 'TEST_REQUESTED'
  | 'TEST_REVIEWED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  relatedPatientId: string | null;
  relatedTestId: string | null;
  patientName: string | null;
  patientBed: string | null;
  read: boolean;
  /** ISO date string */
  createdAt: string;
}

export type IncidentType =
  | 'MED_REFUSAL'
  | 'CARE_INCIDENT'
  | 'VOMIT_AFTER_MED'
  | 'SIDE_EFFECT'
  | 'FALL'
  | 'OTHER'
  | 'EVOLUTIVO'
  | 'FIN_TURNO'
  | 'TRASLADO'
  | 'INCIDENCIA';

export interface Incident {
  id: string;
  patientId: string;
  type: IncidentType;
  description: string;
  reportedBy: string;
  reportedById?: string;
  /** ISO date string */
  reportedAt: string;
}

export type DiagnosticTestType = 'LAB' | 'IMAGING';
export type DiagnosticTestStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export interface DiagnosticTest {
  id: string;
  patientId: string;
  type: DiagnosticTestType;
  name: string;
  /** ISO date string */
  scheduledAt: string;
  status: DiagnosticTestStatus;
  result: string | null;
  requestedBy: string;
}

export interface VitalSigns {
  id: string;
  patientId: string;
  /** ISO date string */
  recordedAt: string;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
  temperature: number | null;
}

// ─── API response wrappers ─────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: Pick<User, 'id' | 'name' | 'role'>;
}
