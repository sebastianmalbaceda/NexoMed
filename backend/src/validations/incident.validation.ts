// src/validations/incident.validation.ts
import { z } from 'zod';

export const createIncidentSchema = z.object({
  patientId: z.string().uuid('ID de paciente inválido'),
  type: z.enum(['MED_REFUSAL', 'CARE_INCIDENT', 'VOMIT_AFTER_MED', 'SIDE_EFFECT', 'FALL', 'OTHER'], { message: 'Tipo de incidencia no válido' }),
  description: z.string().min(1, 'La descripción es obligatoria'),
  severity: z.enum(['LEVE', 'MODERADA', 'GRAVE', 'CRITICA']).optional()
});

export const resolveIncidentSchema = z.object({
  resolution: z.string().min(1, 'La resolución es obligatoria').max(2000, 'Máximo 2000 caracteres'),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type ResolveIncidentInput = z.infer<typeof resolveIncidentSchema>;
