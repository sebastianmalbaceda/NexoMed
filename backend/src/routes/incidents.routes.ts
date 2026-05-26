// src/routes/incidents.routes.ts
import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  getIncidents,
  getIncidentsByPatient,
  createIncident,
  updateIncident,
  deleteIncident,
} from "../controllers/incidents.controller";

const router = Router();

/**
 * @swagger
 * /incidents:
 *   get:
 *     summary: Obtener todas las incidencias
 *     tags: [Incidents]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de incidencias
 */
router.get("/", authenticate, getIncidents);

/**
 * @swagger
 * /incidents/{patientId}:
 *   get:
 *     summary: Obtener incidencias de un paciente
 *     tags: [Incidents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista de incidencias
 */
router.get("/:patientId", authenticate, getIncidentsByPatient);

/**
 * @swagger
 * /incidents:
 *   post:
 *     summary: Registrar una incidencia
 *     tags: [Incidents]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patientId, type, description]
 *             properties:
 *               patientId: { type: string, format: uuid }
 *               type: { type: string }
 *               description: { type: string }
 *               severity: { type: string }
 *     responses:
 *       201:
 *         description: Incidencia registrada
 */
router.post("/", authenticate, createIncident);

/**
 * @swagger
 * /incidents/{id}:
 *   put:
 *     summary: Actualizar o resolver una incidencia
 *     tags: [Incidents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string }
 *               severity: { type: string }
 *               resolution: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Incidencia actualizada
 */
router.put("/:id", authenticate, updateIncident);

/**
 * @swagger
 * /incidents/{id}:
 *   delete:
 *     summary: Eliminar una incidencia
 *     tags: [Incidents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Incidencia eliminada
 */
router.delete("/:id", authenticate, deleteIncident);

export default router;
