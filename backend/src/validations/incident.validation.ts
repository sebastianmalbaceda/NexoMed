// src/validations/incident.validation.ts
import { z } from 'zod';

export const createIncidentSchema = z.object({
  patientId: z.string().uuid('ID de paciente inválido'),
  type: z.enum(['MED_REFUSAL', 'CARE_INCIDENT', 'VOMIT_AFTER_MED', 'SIDE_EFFECT', 'FALL', 'OTHER'], { message: 'Tipo de incidencia no válido' }),
  description: z.string().min(1, 'La descripción es obligatoria'),
  severity: z.enum(['LEVE', 'MODERADA', 'GRAVE']).optional()
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
