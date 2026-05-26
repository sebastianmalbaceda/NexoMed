import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Clock,
  Pill,
  FileWarning,
  ClipboardList,
} from "lucide-react";
import { api } from "@/lib/api";
import { parseAllergies, getAllergiesCount, fullName } from "@/lib/patientUtils";
import type { Patient, CareRecord, Medication, Incident } from "@/lib/types";

const statusConfig: Record<string, { label: string; dot: string }> = {
  ESTABLE: { label: "Estable", dot: "bg-emerald-500" },
  OBSERVACION: { label: "Observación", dot: "bg-amber-500" },
  MODERADO: { label: "Moderado", dot: "bg-orange-500" },
  CRITICO: { label: "Crítico", dot: "bg-red-500" },
};

// ── Vitals ──────────────────────────────────────────────────────────────────
const VITAL_FIELDS = [
  {
    key: "constante_fc",
    label: "Frec. Cardíaca",
    unit: "bpm",
    placeholder: "72",
    color: "bg-red-500",
  },
  {
    key: "constante_tas",
    label: "TA Sistólica",
    unit: "mmHg",
    placeholder: "120",
    color: "bg-orange-500",
  },
  {
    key: "constante_tad",
    label: "TA Diastólica",
    unit: "mmHg",
    placeholder: "80",
    color: "bg-amber-500",
  },
  {
    key: "constante_temp",
    label: "Temperatura",
    unit: "°C",
    placeholder: "36.5",
    color: "bg-blue-500",
  },
  {
    key: "constante_spo2",
    label: "SpO₂",
    unit: "%",
    placeholder: "98",
    color: "bg-violet-500",
  },
] as const;
type VitalKey = (typeof VITAL_FIELDS)[number]["key"];
const VITAL_LABELS: Record<string, string> = {
  constante_fc: "FC",
  constante_tas: "TAS",
  constante_tad: "TAD",
  constante_temp: "Temp",
  constante_spo2: "SpO₂",
};

function getShift(d: Date) {
  const h = d.getHours();
  if (h >= 7 && h < 15) return { label: "Mañana 🌅", key: "morning" };
  if (h >= 15 && h < 23) return { label: "Tarde 🌆", key: "afternoon" };
  return { label: "Noche 🌙", key: "night" };
}
function shiftKey(d: Date) {
  return `${d.toISOString().split("T")[0]}-${getShift(d).key}`;
}
interface VitalGroup {
  shiftKey: string;
  shiftLabel: string;
  dateLabel: string;
  records: CareRecord[];
}
function groupByShift(records: CareRecord[]): VitalGroup[] {
  const map = new Map<string, VitalGroup>();
  for (const r of records.filter((r) => r.type.startsWith("constante_"))) {
    const d = new Date(r.recordedAt);
    const sk = shiftKey(d);
    if (!map.has(sk))
      map.set(sk, {
        shiftKey: sk,
        shiftLabel: getShift(d).label,
        dateLabel: d.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        }),
        records: [],
      });
    map.get(sk)!.records.push(r);
  }
  return Array.from(map.values());
}

// ── TCAE-RF2: Restrictions ───────────────────────────────────────────────────
export interface Restriction {
  type: "diet" | "isolation" | "mobility";
  label: string;
  detail: string;
  emoji: string;
  classes: string;
  badgeColor: string;
}
const DIET_CLASSES = "bg-amber-50 border-amber-300 text-amber-900";
const DIET_BADGE = "bg-amber-400";
const ISOLATION_CLASSES = "bg-red-50 border-red-300 text-red-900";
const ISOLATION_BADGE = "bg-red-500";
const MOBILITY_CLASSES = "bg-blue-50 border-blue-300 text-blue-900";
const MOBILITY_BADGE = "bg-blue-500";

export function getRestrictions(p: Patient): Restriction[] {
  const res: Restriction[] = [];

  // TCAE-RF2: prefer explicit DB-stored restrictions; fall back to inference
  if (p.dietRestriction) {
    res.push({
      type: "diet",
      label: p.dietRestriction,
      detail: "Restricción dietética",
      emoji: "🍽️",
      classes: DIET_CLASSES,
      badgeColor: DIET_BADGE,
    });
  } else {
    const diag = p.diagnosis.toLowerCase();
    if (/diabet|glucos|insul/.test(diag))
      res.push({
        type: "diet",
        label: "Dieta diabética",
        detail: "Sin azúcares simples · Control glucémico",
        emoji: "🍽️",
        classes: DIET_CLASSES,
        badgeColor: DIET_BADGE,
      });
    else if (/card|hipert|tens|coronar/.test(diag))
      res.push({
        type: "diet",
        label: "Dieta hiposódica",
        detail: "Reducción de sodio · Sin procesados",
        emoji: "🧂",
        classes: DIET_CLASSES,
        badgeColor: DIET_BADGE,
      });
    else if (/renal|riñ|nefr/.test(diag))
      res.push({
        type: "diet",
        label: "Dieta hipoproteica",
        detail: "Control de proteínas y potasio",
        emoji: "⚖️",
        classes: DIET_CLASSES,
        badgeColor: DIET_BADGE,
      });
    else if (getAllergiesCount(p.allergies) > 0)
      res.push({
        type: "diet",
        label: `Alergia: ${parseAllergies(p.allergies)[0]}`,
        detail: "Verificar todos los ingredientes",
        emoji: "🚫",
        classes: DIET_CLASSES,
        badgeColor: DIET_BADGE,
      });
  }

  if (p.isolationRestriction) {
    res.push({
      type: "isolation",
      label: p.isolationRestriction,
      detail: "Protocolo de aislamiento",
      emoji: "😷",
      classes: ISOLATION_CLASSES,
      badgeColor: ISOLATION_BADGE,
    });
  } else {
    const diag = p.diagnosis.toLowerCase();
    if (/infec|seps|neumoni|covid|gripe|bacteria|mrsa/.test(diag))
      res.push({
        type: "isolation",
        label: "Aislamiento de contacto",
        detail: "Guantes y bata obligatorios",
        emoji: "😷",
        classes: ISOLATION_CLASSES,
        badgeColor: ISOLATION_BADGE,
      });
    else if (/tuberc|tbc/.test(diag))
      res.push({
        type: "isolation",
        label: "Aislamiento respiratorio",
        detail: "Mascarilla FFP2 obligatoria",
        emoji: "😷",
        classes: ISOLATION_CLASSES,
        badgeColor: ISOLATION_BADGE,
      });
  }

  if (p.mobilityRestriction) {
    res.push({
      type: "mobility",
      label: p.mobilityRestriction,
      detail: "Restricción de movilidad",
      emoji: "🛏️",
      classes: MOBILITY_CLASSES,
      badgeColor: MOBILITY_BADGE,
    });
  } else {
    const diag = p.diagnosis.toLowerCase();
    if (/fractur|artro|prótesis|protesis|post.?op|cirug/.test(diag))
      res.push({
        type: "mobility",
        label: "Movilización asistida",
        detail: "No movilizar sin supervisión",
        emoji: "🛏️",
        classes: MOBILITY_CLASSES,
        badgeColor: MOBILITY_BADGE,
      });
    else if (/trombo|embolia/.test(diag))
      res.push({
        type: "mobility",
        label: "Reposo relativo",
        detail: "Medias de compresión obligatorias",
        emoji: "🦵",
        classes: MOBILITY_CLASSES,
        badgeColor: MOBILITY_BADGE,
      });
  }

  return res;
}

// ── TCAE-RF3: Incidents ──────────────────────────────────────────────────────
const INCIDENT_TYPES = [
  { value: "MED_REFUSAL", label: "Rechazo de medicación" },
  { value: "VOMIT_AFTER_MED", label: "Vómito tras administración" },
  { value: "SIDE_EFFECT", label: "Efecto adverso observado" },
  { value: "FALL", label: "Caída del paciente" },
  { value: "OTHER", label: "Otro incidente" },
];

export const incidentSchema = z.object({
  type: z.enum(
    ["MED_REFUSAL", "VOMIT_AFTER_MED", "SIDE_EFFECT", "FALL", "OTHER"],
    { message: "Tipo de incidencia no válido" },
  ),
  description: z.string().min(1, "La descripción es obligatoria"),
});

type IncidentForm = z.infer<typeof incidentSchema>;

const vitalsSchema = z.object({
  constante_fc: z.string().optional(),
  constante_tas: z.string().optional(),
  constante_tad: z.string().optional(),
  constante_temp: z.string().optional(),
  constante_spo2: z.string().optional(),
  notes: z.string().optional(),
});

type VitalsForm = z.infer<typeof vitalsSchema>;

// TCAE-RF1 care types
const TCAE_CARE_TYPES = [
  { value: "higiene", label: "🧼 Higiene del paciente" },
  { value: "ingesta", label: "🍽️ Ingesta de alimentos" },
  { value: "balance", label: "💧 Balance hídrico parcial" },
];

const tcaeCareSchema = z.object({
  type: z.enum(["higiene", "ingesta", "balance"], {
    message: "Tipo no válido",
  }),
  value: z.string().min(1, "El valor es obligatorio"),
  notes: z.string().optional(),
});
type TCAECareForm = z.infer<typeof tcaeCareSchema>;

export default function TCAEPage() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get("patientId");
  const [selectedId, setSelectedId] = useState<string | null>(urlPatientId);
  const [successMsg, setSuccessMsg] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [incidentSuccess, setIncidentSuccess] = useState("");
  const [showIncidentForm, setShowIncidentForm] = useState(false);

  const {
    register: registerIncident,
    handleSubmit: handleSubmitIncident,
    reset: resetIncident,
    formState: { errors: incidentErrors },
  } = useForm<IncidentForm>({
    resolver: zodResolver(incidentSchema),
    defaultValues: { type: "MED_REFUSAL", description: "" },
  });

  const [careSuccess, setCareSuccess] = useState("");
  const {
    register: registerCare,
    handleSubmit: handleSubmitCare,
    reset: resetCare,
    formState: { errors: careErrors },
  } = useForm<TCAECareForm>({
    resolver: zodResolver(tcaeCareSchema),
    defaultValues: { type: "higiene", value: "", notes: "" },
  });
  const careMutation = useMutation({
    mutationFn: (body: {
      patientId: string;
      type: string;
      value: string;
      notes?: string;
    }) => api.post<CareRecord>("/cares", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cares", selectedId] });
      resetCare();
      setCareSuccess("Cuidado registrado");
      setTimeout(() => setCareSuccess(""), 3000);
    },
  });

  const {
    register: registerVital,
    handleSubmit: handleSubmitVitals,
    reset: resetVitals,
    formState: { errors: vitalsErrors },
  } = useForm<VitalsForm>({
    resolver: zodResolver(vitalsSchema),
    defaultValues: {
      constante_fc: "",
      constante_tas: "",
      constante_tad: "",
      constante_temp: "",
      constante_spo2: "",
      notes: "",
    },
  });

  const {
    data: patients = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["patients", "assigned"],
    queryFn: () => api.get<Patient[]>("/patients?assigned=true"),
  });
  const selected = patients.find((p) => p.id === selectedId) ?? null;

  const { data: careRecords = [], isLoading: loadingCares } = useQuery({
    queryKey: ["cares", selectedId],
    queryFn: () => api.get<CareRecord[]>(`/cares/${selectedId}`),
    enabled: !!selectedId,
  });
  const { data: medications = [] } = useQuery({
    queryKey: ["medications", selectedId],
    queryFn: () => api.get<Medication[]>(`/medications/${selectedId}`),
    enabled: !!selectedId,
  });
  const { data: patientIncidents = [] } = useQuery({
    queryKey: ["incidents", selectedId],
    queryFn: () => api.get<Incident[]>(`/incidents/${selectedId}`),
    enabled: !!selectedId,
  });

  const incidentMutation = useMutation({
    mutationFn: (body: {
      patientId: string;
      type: string;
      description: string;
    }) => api.post<Incident>("/incidents", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents", selectedId] });
      resetIncident();
      setShowIncidentForm(false);
      setIncidentSuccess("Incidencia registrada");
      setTimeout(() => setIncidentSuccess(""), 3000);
    },
    onError: () => {
      setIncidentSuccess("");
    },
  });

  const vitalGroups = groupByShift(careRecords);
  const latestByType: Partial<Record<string, CareRecord>> = {};
  // Ordenar descendente para que la última iteración deje el registro más reciente
  const sortedCareRecords = [...careRecords].sort(
    (a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
  for (const r of sortedCareRecords) {
    if (r.type.startsWith("constante_")) latestByType[r.type] = r;
  }

  const submitMutation = useMutation({
    mutationFn: async (payload: {
      entries: { type: VitalKey; value: string }[];
      notes?: string;
    }) => {
      const results = [];
      for (const entry of payload.entries) {
        const field = VITAL_FIELDS.find((f) => f.key === entry.type)!;
        try {
          const r = await api.post<CareRecord>("/cares", {
            patientId: selectedId,
            type: entry.type,
            value: entry.value,
            unit: field.unit,
            notes: payload.notes?.trim() || undefined,
          });
          results.push({ ok: true, r });
        } catch (e) {
          results.push({
            ok: false,
            msg: (e as Error).message,
            type: entry.type,
          });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      qc.invalidateQueries({ queryKey: ["cares", selectedId] });
      const errs = results
        .filter((r) => !r.ok)
        .map((r) => `${VITAL_LABELS[r.type ?? ""] ?? r.type}: ${r.msg}`);
      if (errs.length > 0) {
        setErrors(errs);
        setSuccessMsg("");
      } else {
        setSuccessMsg("Constantes registradas");
        setErrors([]);
        resetVitals();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    },
  });

  const onSubmitVitals = (data: VitalsForm) => {
    if (!selectedId) return;
    const entries = VITAL_FIELDS.filter((f) => data[f.key]?.trim()).map(
      (f) => ({ type: f.key, value: data[f.key]!.trim() }),
    );
    if (!entries.length) return;
    setErrors([]);
    setSuccessMsg("");
    submitMutation.mutate({ entries, notes: data.notes });
  };

  const onSubmitIncident = (data: IncidentForm) => {
    if (!selectedId) return;
    incidentMutation.mutate({ patientId: selectedId, ...data });
  };

  const restrictions = selected ? getRestrictions(selected) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Constantes y Cuidados — TCAE
        </h1>
        <p className="text-slate-500 text-sm font-medium mt-1">
          Constantes vitales · Alertas de restricciones · Registro de
          incidencias
        </p>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-medium">
          No se pudieron cargar los pacientes. Verifica que el backend esté
          activo.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Patient list */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-800 flex items-center justify-between">
            <p className="text-xs font-black text-white uppercase tracking-widest">
              Pacientes
            </p>
            <span className="text-xs bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">
              {patients.length}
            </span>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {patients.map((p) => {
                const isSelected = selectedId === p.id;
                const restr = getRestrictions(p);
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => {
                        setSelectedId(p.id);
                        setErrors([]);
                        setSuccessMsg("");
                        resetVitals();
                      }}
                      className={`w-full text-left px-4 py-3 transition-all hover:bg-slate-50 border-l-4 ${isSelected ? "bg-violet-50 border-violet-500" : "border-transparent"}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {fullName(p)}
                        </p>
                        {(() => {
                          const sc =
                            statusConfig[p.status] ?? statusConfig.ESTABLE;
                          return (
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`}
                              title={sc.label}
                            />
                          );
                        })()}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {p.diagnosis}
                      </p>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {restr.map((r) => (
                          <span
                            key={r.type}
                            className={`text-[10px] px-1.5 py-0.5 rounded border font-black ${r.classes}`}
                          >
                            {r.emoji}
                          </span>
                        ))}
                        {getAllergiesCount(p.allergies) > 0 && (
                          <span className="text-[10px] bg-red-500 text-white font-black px-1.5 py-0.5 rounded">
                            🚫{getAllergiesCount(p.allergies)}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Activity className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">
                Selecciona un paciente para ver su información
              </p>
            </div>
          ) : (
            <>
              {/* Patient header + TCAE-RF2 restrictions */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-900 px-5 py-4 flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                    {new Date().getFullYear() -
                      new Date(selected.dob).getFullYear() >=
                    65
                      ? "👴"
                      : "🧑"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-black text-white">
                        {fullName(selected)}
                      </p>
                      {(() => {
                        const sc =
                          statusConfig[selected.status] ?? statusConfig.ESTABLE;
                        return (
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${sc.dot}`}
                            title={sc.label}
                          />
                        );
                      })()}
                    </div>
                    <p className="text-xs text-slate-400">
                      {selected.bed
                        ? `Hab. ${selected.bed.room}${selected.bed.letter}`
                        : "Sin cama"}{" "}
                      · {selected.diagnosis}
                    </p>
                  </div>
                  {getAllergiesCount(selected.allergies) > 0 && (
                    <span className="text-[10px] bg-red-500 text-white font-black px-2 py-1 rounded-lg shrink-0">
                      🚫 {parseAllergies(selected.allergies).join(", ")}
                    </span>
                  )}
                </div>

                {/* TCAE-RF2 */}
                {restrictions.length > 0 ? (
                  <div className="p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />{" "}
                      Restricciones activas — TCAE-RF2
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {restrictions.map((r) => (
                        <div
                          key={r.type}
                          className={`rounded-xl border-2 p-3 ${r.classes}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`w-6 h-6 rounded-lg ${r.badgeColor} flex items-center justify-center text-sm shrink-0`}
                            >
                              {r.emoji}
                            </span>
                            <p className="text-xs font-black">{r.label}</p>
                          </div>
                          <p className="text-xs opacity-80 font-medium">
                            {r.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-3 flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <p className="text-xs font-bold">
                      Sin restricciones activas
                    </p>
                  </div>
                )}
              </div>

              {/* TCAE-RF3: Medication status + incidents */}
              <div className="bg-white border border-slate-200 border-t-4 border-t-orange-400 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-xl bg-orange-500 flex items-center justify-center">
                    <Pill className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="font-black text-slate-900">
                    Estado de la medicación
                  </h3>
                  <span className="ml-auto text-[10px] bg-orange-100 text-orange-700 font-black px-2 py-0.5 rounded-full">
                    TCAE-RF3
                  </span>
                </div>

                {medications.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6 font-medium">
                    Sin medicación activa
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {(() => {
                      const now = Date.now();
                      return medications.map((m) => {
                        const past = (m.schedules ?? [])
                          .filter(
                            (s) => new Date(s.scheduledAt).getTime() <= now,
                          )
                          .sort(
                            (a, b) =>
                              new Date(b.scheduledAt).getTime() -
                              new Date(a.scheduledAt).getTime(),
                          );
                        const lastDose = past[0];
                        const isAdministered = !!lastDose?.administeredAt;
                        return (
                          <li
                            key={m.id}
                            className="px-5 py-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900">
                                {m.drugName}
                              </p>
                              <p className="text-xs text-slate-400">
                                {m.dose} · {m.route} · cada {m.frequencyHrs}h
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 text-white ${isAdministered ? "bg-emerald-500" : "bg-amber-500"}`}
                            >
                              {isAdministered ? "✓ ADMINISTRADO" : "PENDIENTE"}
                            </span>
                          </li>
                        );
                      });
                    })()}
                  </ul>
                )}

                {/* Incident registration */}
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileWarning className="w-4 h-4 text-slate-500" />
                      <p className="text-sm font-black text-slate-800">
                        Incidencias
                      </p>
                      {patientIncidents.length > 0 && (
                        <span className="text-[10px] bg-red-500 text-white font-black px-1.5 py-0.5 rounded-full">
                          {patientIncidents.length}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowIncidentForm((v) => !v)}
                      className="text-xs bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-black transition-colors"
                    >
                      + Registrar
                    </button>
                  </div>

                  {showIncidentForm && (
                    <form
                      onSubmit={handleSubmitIncident(onSubmitIncident)}
                      className="space-y-2 mb-3 p-3 bg-red-50 border-2 border-red-200 rounded-xl"
                    >
                      <select
                        {...registerIncident("type")}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-red-400/30"
                      >
                        {INCIDENT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      {incidentErrors.type && (
                        <p className="text-xs text-red-600 font-medium">
                          {incidentErrors.type.message}
                        </p>
                      )}
                      <input
                        type="text"
                        placeholder="Descripción de la incidencia..."
                        {...registerIncident("description")}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-red-400/30"
                      />
                      {incidentErrors.description && (
                        <p className="text-xs text-red-600 font-medium">
                          {incidentErrors.description.message}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={incidentMutation.isPending}
                        className="bg-red-500 text-white text-xs font-black px-4 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {incidentMutation.isPending && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        Guardar incidencia
                      </button>
                    </form>
                  )}

                  {incidentSuccess && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1 mb-2 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {incidentSuccess}
                    </p>
                  )}
                  {incidentMutation.isError && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mb-2 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />{" "}
                      {(incidentMutation.error as Error).message}
                    </p>
                  )}

                  {patientIncidents.length > 0 && (
                    <ul className="space-y-2">
                      {patientIncidents.map((inc) => (
                        <li
                          key={inc.id}
                          className="bg-red-50 border-l-4 border-red-400 rounded-xl px-3 py-2"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-xs font-black text-red-700">
                              {INCIDENT_TYPES.find((t) => t.value === inc.type)
                                ?.label ?? inc.type}
                            </p>
                            <span className="text-[10px] text-slate-400 shrink-0 font-bold whitespace-nowrap">
                              {new Date(inc.reportedAt).toLocaleDateString(
                                "es-ES",
                                { day: "2-digit", month: "2-digit" },
                              )}{" "}
                              {new Date(inc.reportedAt).toLocaleTimeString(
                                "es-ES",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-red-600 font-medium mt-0.5">
                            {inc.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* TCAE-RF1: Hygiene, food intake, fluid balance */}
              <div className="bg-white border border-slate-200 border-t-4 border-t-emerald-400 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <ClipboardList className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="font-black text-slate-900">
                    Registrar cuidado
                  </h3>
                  <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-700 font-black px-2 py-0.5 rounded-full">
                    TCAE-RF1
                  </span>
                </div>
                <form
                  onSubmit={handleSubmitCare((data) => {
                    if (!selectedId) return;
                    careMutation.mutate({
                      patientId: selectedId,
                      ...data,
                      notes: data.notes?.trim() || undefined,
                    });
                  })}
                  className="p-5 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                        Tipo de cuidado
                      </label>
                      <select
                        {...registerCare("type")}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-slate-300"
                      >
                        {TCAE_CARE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      {careErrors.type && (
                        <p className="text-xs text-red-500 mt-1">
                          {careErrors.type.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                        Valor / Descripción *
                      </label>
                      <input
                        type="text"
                        placeholder="ej: aseo completo, 75% bandeja, 500 mL..."
                        {...registerCare("value")}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 ring-slate-300"
                      />
                      {careErrors.value && (
                        <p className="text-xs text-red-500 mt-1">
                          {careErrors.value.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Observaciones (opcional)"
                    {...registerCare("notes")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 ring-slate-300"
                  />
                  {careSuccess && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      {careSuccess}
                    </div>
                  )}
                  {careMutation.isError && (
                    <div className="flex items-center gap-2 text-sm text-red-600 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {(careMutation.error as Error).message}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={careMutation.isPending}
                    className="flex items-center gap-2 bg-slate-900 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-black transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {careMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Registrar cuidado
                  </button>
                </form>
              </div>

              {/* Vitals form */}
              <div className="bg-white border border-slate-200 border-t-4 border-t-violet-400 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-xl bg-violet-500 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="font-black text-slate-900">
                    Registro de constantes vitales
                  </h3>
                </div>
                <form
                  onSubmit={handleSubmitVitals(onSubmitVitals)}
                  className="p-5"
                >
                  {/* Latest readings */}
                  {Object.keys(latestByType).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {VITAL_FIELDS.map((f) => {
                        const last = latestByType[f.key];
                        if (!last) return null;
                        return (
                          <div
                            key={f.key}
                            className={`${f.color} rounded-xl px-3 py-2 text-center text-white`}
                          >
                            <p className="text-[10px] font-black text-white/70 uppercase">
                              {f.label}
                            </p>
                            <p className="text-sm font-black">
                              {last.value}{" "}
                              <span className="text-xs font-bold opacity-70">
                                {f.unit}
                              </span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    {VITAL_FIELDS.map((f) => (
                      <div key={f.key}>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                          {f.label}{" "}
                          <span className="font-normal normal-case opacity-60">
                            ({f.unit})
                          </span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder={f.placeholder}
                          {...registerVital(f.key)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-slate-300"
                        />
                        {vitalsErrors[f.key] && (
                          <p className="text-xs text-red-500 mt-1">
                            {vitalsErrors[f.key]?.message}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Observaciones (opcional)"
                    {...registerVital("notes")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 ring-slate-300 mb-3"
                  />

                  {successMsg && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 font-bold mb-3">
                      <CheckCircle2 className="w-4 h-4" />
                      {successMsg}
                    </div>
                  )}
                  {errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 space-y-1">
                      {errors.map((e, i) => (
                        <p
                          key={i}
                          className="text-xs text-red-600 flex items-center gap-1.5 font-medium"
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {e}
                        </p>
                      ))}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="flex items-center gap-2 bg-slate-900 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Guardar constantes
                  </button>
                </form>
              </div>

              {/* Shift history */}
              <div className="bg-white border border-slate-200 border-t-4 border-t-blue-400 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-xl bg-blue-500 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="font-black text-slate-900">
                    Historial por turno
                  </h3>
                </div>
                <div className="p-5">
                  {loadingCares ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                    </div>
                  ) : vitalGroups.length === 0 ? (
                    <p className="text-sm text-slate-400 font-medium">
                      Sin constantes registradas
                    </p>
                  ) : (
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                      {vitalGroups.map((group) => (
                        <div key={group.shiftKey}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-wide">
                              {group.shiftLabel}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {group.dateLabel}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {VITAL_FIELDS.map((f) => {
                              const record = group.records.find(
                                (r) => r.type === f.key,
                              );
                              if (!record) return null;
                              const dt = new Date(record.recordedAt);
                              return (
                                <div
                                  key={f.key}
                                  className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2"
                                >
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                                    {f.label}
                                  </p>
                                  <p className="text-sm font-black text-slate-900">
                                    {record.value}{" "}
                                    <span className="text-xs font-normal text-slate-400">
                                      {f.unit}
                                    </span>
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                    {dt.toLocaleTimeString("es-ES", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
