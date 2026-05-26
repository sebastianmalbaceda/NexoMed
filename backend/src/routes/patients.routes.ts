// src/routes/patients.routes.ts
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  dischargePatient,
  getPatientVitals,
  searchPatientByDni,
} from "../controllers/patients.controller";
import { getCareRecords } from "../controllers/careRecords.controller";
import { getIncidents } from "../controllers/incidents.controller";

const router = Router();

// GET /api/patients/search?dni=XXX — buscar paciente por DNI (para re-ingreso rápido)
router.get("/search", authenticate, searchPatientByDni);

// GET /api/patients — listar pacientes activos
router.get("/", authenticate, getPatients);

// GET /api/patients/:patientId/care-records — historial de cuidados (MED-RF1, SYS-RF2)
router.get("/:patientId/care-records", authenticate, getCareRecords);

// GET /api/patients/:patientId/vitals — constantes vitales del paciente
router.get("/:patientId/vitals", authenticate, getPatientVitals);

// GET /api/patients/:patientId/incidents — incidencias del paciente (alias)
router.get("/:patientId/incidents", authenticate, getIncidents);

// GET /api/patients/:id — ficha completa del paciente
router.get("/:id", authenticate, getPatientById);

// POST /api/patients — dar de alta (crea nuevo o re-ingresa por DNI)
router.post("/", authenticate, authorize("DOCTOR", "NURSE"), createPatient);

// PUT /api/patients/:id — modificar datos del paciente (SCRUM-31)
router.put("/:id", authenticate, authorize("DOCTOR", "NURSE"), updatePatient);

// PUT /api/patients/:id/discharge — dar de baja (liberar cama)
router.put(
  "/:id/discharge",
  authenticate,
  authorize("DOCTOR", "NURSE"),
  dischargePatient,
);

export default router;
