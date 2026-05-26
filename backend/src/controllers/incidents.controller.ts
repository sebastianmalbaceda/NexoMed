// src/controllers/incidents.controller.ts
import { Response } from "express";
import { prisma } from "../lib/prismaClient";
import { AuthRequest } from "../middlewares/auth.middleware";
import { createIncidentSchema } from "../validations/incident.validation";
import { handlePrismaError } from "../lib/errorHandler";
import { notifyNursesAboutIncident } from "../services/notification.service";

// GET /api/incidents — todas las incidencias
export const getIncidents = async (req: AuthRequest, res: Response) => {
  try {
    const incidents = await prisma.incident.findMany({
      orderBy: { reportedAt: "desc" },
      take: 500,
      include: {
        reportedBy: { select: { name: true, role: true } },
        patient: { select: { name: true } },
      },
    });
    res.json(
      incidents.map((i) => ({
        ...i,
        reportedBy: i.reportedBy?.name ?? "—",
      })),
    );
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// GET /api/incidents/:patientId — incidencias de un paciente
export const getIncidentsByPatient = async (
  req: AuthRequest,
  res: Response,
) => {
  const { patientId } = req.params as { patientId: string };
  try {
    const incidents = await prisma.incident.findMany({
      where: { patientId },
      orderBy: { reportedAt: "desc" },
      take: 500,
      include: {
        reportedBy: { select: { name: true, role: true } },
      },
    });
    res.json(
      incidents.map((i) => ({ ...i, reportedBy: i.reportedBy?.name ?? "—" })),
    );
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// POST /api/incidents — registrar incidencia
export const createIncident = async (req: AuthRequest, res: Response) => {
  const validation = createIncidentSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0].message });
  }

  const { patientId, type, description } = validation.data;
  try {
    // Always set reportedAt explicitly to ensure full DateTime (date + time)
    const incident = await prisma.incident.create({
      data: {
        patientId,
        type,
        description,
        reportedById: req.user!.id,
        reportedAt: new Date(),
      },
    });

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    const typeLabel =
      type === "MED_REFUSAL"
        ? "Rechazo de medicación"
        : "Incidente de cuidados";

    await notifyNursesAboutIncident(
      patientId,
      "INCIDENT_NEW",
      `${typeLabel} registrado para ${patient?.name ?? "paciente"}: ${description}`,
      req.user!.name,
    );

    res.status(201).json(incident);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};
