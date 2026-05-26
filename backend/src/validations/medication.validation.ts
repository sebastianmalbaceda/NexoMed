// src/validations/medication.validation.ts
import { z } from 'zod';

const routeEnum = z.enum(['oral', 'IV', 'IM', 'SC', 'TOPICAL', 'SUBCUTANEOUS', 'RECTAL', 'INHALED'], {
  message: 'Vía de administración no válida',
});

const optionalDate = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), 'Fecha inválida')
  .optional()
  .nullable();

export const createMedicationSchema = z.object({
  patientId: z.string().uuid('ID de paciente inválido'),
  drugName: z.string().min(1, 'El nombre del fármaco es obligatorio'),
  nregistro: z.string().optional(),
  dose: z.string().min(1, 'La dosis es obligatoria'),
  route: routeEnum,
  frequencyHrs: z.number().int().positive('La frecuencia debe ser un número positivo de horas'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Fecha de inicio inválida'),
  endDate: optionalDate,
});

export const updateMedicationSchema = z.object({
  drugName: z.string().min(1, 'El nombre del fármaco es obligatorio'),
  nregistro: z.string().optional().nullable(),
  dose: z.string().min(1, 'La dosis es obligatoria'),
  route: routeEnum,
  frequencyHrs: z.number().int().positive('La frecuencia debe ser un número positivo de horas'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Fecha de inicio inválida'),
  endDate: optionalDate,
});

export const updateScheduleSchema = z.object({
  newStartTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Nueva fecha de inicio inválida'),
});

export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
