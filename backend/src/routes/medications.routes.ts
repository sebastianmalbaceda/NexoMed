// src/routes/medications.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import {
  getMedications,
  createMedication,
  updateMedication,
  deactivateMedication,
  administerSchedule,
  updateMedicationSchedule
} from '../controllers/medications.controller';

const router = Router();

/**
 * @swagger
 * /medications/{patientId}:
 *   get:
 *     summary: Obtener medicación activa de un paciente
 *     tags: [Medications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista de medicaciones activas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Medication'
 */
router.get('/:patientId', authenticate, getMedications);

/**
 * @swagger
 * /medications:
 *   post:
 *     summary: Prescribir medicación (solo DOCTOR)
 *     tags: [Medications]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patientId, drugName, dose, route, frequencyHrs, startTime]
 *             properties:
 *               patientId: { type: string, format: uuid }
 *               drugName: { type: string }
 *               nregistro: { type: string }
 *               dose: { type: string }
 *               route: { type: string }
 *               frequencyHrs: { type: integer }
 *               startTime: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Medicación prescrita
 *       400:
 *         description: Validación fallida
 */
router.post('/', authenticate, authorize('DOCTOR'), createMedication);
router.put('/:id', authenticate, authorize('DOCTOR'), updateMedication);

/**
 * @swagger
 * /medications/{id}/deactivate:
 *   put:
 *     summary: Suspender medicación (solo DOCTOR)
 *     tags: [Medications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Medicación suspendida
 *       404:
 *         description: Medicación no encontrada
 */
router.put('/:id/deactivate', authenticate, authorize('DOCTOR'), deactivateMedication);

/**
 * @swagger
 * /medications/{id}/schedule:
 *   put:
 *     summary: Recalcular horarios de medicación
 *     tags: [Medications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newStartTime]
 *             properties:
 *               newStartTime: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Horarios recalculados
 *       400:
 *         description: Validación fallida
 *       404:
 *         description: Medicación no encontrada
 */
router.put('/:id/schedule', authenticate, authorize('DOCTOR', 'NURSE'), updateMedicationSchedule);

/**
 * @swagger
 * /medications/schedules/{scheduleId}/administer:
 *   post:
 *     summary: Marcar dosis como administrada
 *     tags: [Medications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dosis registrada como administrada
 *       404:
 *         description: Horario no encontrado
 */
router.post('/schedules/:scheduleId/administer', authenticate, authorize('DOCTOR', 'NURSE'), administerSchedule);

export default router;
