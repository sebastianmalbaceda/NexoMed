import { z } from 'zod';

const shiftSchema = z.enum(['morning', 'afternoon', 'night']);

export const getScheduleQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
    .optional(),
  // UTC timestamps sent by the frontend based on local midnight — take precedence over 'date'
  start: z.string().datetime({ message: 'Timestamp de inicio inválido' }).optional(),
  end: z.string().datetime({ message: 'Timestamp de fin inválido' }).optional(),
  shift: shiftSchema.optional(),
  patientId: z.string().uuid('ID de paciente inválido').optional(),
  nurseId: z.string().uuid('ID de enfermero inválido').optional(),
});

export type GetScheduleQuery = z.infer<typeof getScheduleQuerySchema>;
export type ShiftKey = z.infer<typeof shiftSchema>;
