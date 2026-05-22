// src/routes/diagnosticTests.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { getAllDiagnosticTests, getDiagnosticTests, createDiagnosticTest, addTestResult, updateTestStatus, deleteDiagnosticTest } from '../controllers/diagnosticTests.controller';

const router = Router();

/**
 * @swagger
 * /tests:
 *   get:
 *     summary: Obtener vista global de pruebas diagnósticas
 *     tags: [DiagnosticTests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [LAB, IMAGING] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [REQUESTED, APPROVED, REJECTED, COMPLETED] }
 *       - in: query
 *         name: date
 *         schema: { type: string, example: 2026-04-27 }
 *     responses:
 *       200:
 *         description: Lista global de pruebas
 */
router.get('/', authenticate, getAllDiagnosticTests);

/**
 * @swagger
 * /tests/{patientId}:
 *   get:
 *     summary: Obtener pruebas diagnósticas de un paciente
 *     tags: [DiagnosticTests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista de pruebas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DiagnosticTest'
 */
router.get('/:patientId', authenticate, getDiagnosticTests);

/**
 * @swagger
 * /tests:
 *   post:
 *     summary: Solicitar prueba diagnóstica (DOCTOR y NURSE)
 *     tags: [DiagnosticTests]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patientId, type, name, scheduledAt]
 *             properties:
 *               patientId: { type: string, format: uuid }
 *               type: { type: string, enum: [LAB, IMAGING] }
 *               name: { type: string }
 *               scheduledAt: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Prueba solicitada
 *       400:
 *         description: Validación fallida
 */
router.post('/', authenticate, authorize('DOCTOR', 'NURSE'), createDiagnosticTest);

/**
 * @swagger
 * /tests/{id}/status:
 *   put:
 *     summary: Cambiar estado de prueba (DOCTOR)
 *     tags: [DiagnosticTests]
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [APPROVED, REJECTED, COMPLETED] }
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       400:
 *         description: Validación fallida
 *       404:
 *         description: Prueba no encontrada
 */
router.put('/:id/status', authenticate, authorize('DOCTOR'), updateTestStatus);

/**
 * @swagger
 * /tests/{id}/result:
 *   put:
 *     summary: Registrar resultado de prueba
 *     tags: [DiagnosticTests]
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
 *             required: [result]
 *             properties:
 *               result: { type: string }
 *     responses:
 *       200:
 *         description: Resultado registrado
 *       400:
 *         description: Validación fallida
 *       404:
 *         description: Prueba no encontrada
 */
router.put('/:id/result', authenticate, authorize('DOCTOR', 'NURSE'), addTestResult);

router.delete('/:id', authenticate, authorize('DOCTOR'), deleteDiagnosticTest);

export default router;
