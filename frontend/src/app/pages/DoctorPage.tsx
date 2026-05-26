import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
  Pill,
  Loader2,
  User,
  AlertCircle,
  Plus,
  X,
  Check,
  Trash2,
  Pencil,
} from "lucide-react";
import { api } from "@/lib/api";
import { parseAllergies, getAllergiesCount } from "@/lib/patientUtils";
import { PatientSchedule } from "@/components/hospital/PatientSchedule";
import type { Patient, Medication } from "@/lib/types";

const FREQ_OPTIONS = [2, 4, 6, 8, 12, 24];

const statusConfig: Record<string, { label: string; dot: string }> = {
  ESTABLE: { label: "Estable", dot: "bg-emerald-500" },
  OBSERVACION: { label: "Observación", dot: "bg-amber-500" },
  MODERADO: { label: "Moderado", dot: "bg-orange-500" },
  CRITICO: { label: "Crítico", dot: "bg-red-500" },
};

const ROUTE_OPTIONS = [
  { value: "oral", label: "Oral" },
  { value: "IV", label: "Intravenosa" },
  { value: "IM", label: "Intramuscular" },
  { value: "SC", label: "Subcutánea" },
  { value: "TOPICAL", label: "Tópica" },
];

// Produces a "YYYY-MM-DDTHH:mm" string in LOCAL time for datetime-local inputs.
function toLocalDatetimeStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const prescriptionSchema = z.object({
  drugName: z.string().min(1, "El medicamento es obligatorio"),
  nregistro: z.string().optional(),
  dose: z.string().min(1, "La dosis es obligatoria"),
  route: z.enum([
    "oral",
    "IV",
    "IM",
    "SC",
    "TOPICAL",
    "SUBCUTANEOUS",
    "RECTAL",
    "INHALED",
  ]),
  frequencyHrs: z.number().int().positive("La frecuencia debe ser mayor que 0"),
  startTime: z.string().min(1, "La fecha de inicio es obligatoria"),
  indefinite: z.boolean().default(true),
  endDate: z.string().optional(),
});

type PrescriptionForm = z.infer<typeof prescriptionSchema>;

export default function DoctorPage() {
  const qc = useQueryClient();
  const location = useLocation();
  const state = location.state as { patientId?: string } | null;
  const [selectedId, setSelectedId] = useState<string | null>(
    state?.patientId ?? null,
  );
  const [showForm, setShowForm] = useState(!!state?.patientId);
  const [successMsg, setSuccessMsg] = useState("");
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [editStartHour, setEditStartHour] = useState(8);

  useEffect(() => {
    if (state?.patientId) {
      setSelectedId(state.patientId);
      setShowForm(true);
      window.history.replaceState({}, "");
    }
  }, [state?.patientId]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PrescriptionForm>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      drugName: "",
      nregistro: "",
      dose: "",
      route: "oral",
      frequencyHrs: 8,
      startTime: toLocalDatetimeStr(new Date()),
      indefinite: true,
      endDate: "",
    },
  });
  const isIndefinite = watch("indefinite");

  const {
    data: patients = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["patients"],
    queryFn: () => api.get<Patient[]>("/patients"),
  });
  const selected = patients.find((p) => p.id === selectedId) ?? null;

  const { data: medications = [], isLoading: loadingMeds } = useQuery({
    queryKey: ["medications", selectedId],
    queryFn: () => api.get<Medication[]>(`/medications/${selectedId}`),
    enabled: !!selectedId,
  });

  const prescriptionMutation = useMutation({
    mutationFn: (body: PrescriptionForm & { patientId: string }) =>
      api.post<Medication>("/medications", {
        patientId: body.patientId,
        drugName: body.drugName,
        nregistro: body.nregistro,
        dose: body.dose,
        route: body.route,
        frequencyHrs: body.frequencyHrs,
        startTime: new Date(body.startTime).toISOString(),
        endDate: !body.indefinite && body.endDate ? new Date(body.endDate).toISOString() : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications", selectedId] });
      reset({
        drugName: "", nregistro: "", dose: "", route: "oral",
        frequencyHrs: 8, startTime: toLocalDatetimeStr(new Date()),
        indefinite: true, endDate: "",
      });
      setShowForm(false);
      setSuccessMsg("Medicación prescrita correctamente");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.put(`/medications/${id}/deactivate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications", selectedId] });
    },
  });

  const scheduleUpdateMutation = useMutation({
    mutationFn: ({ medId, startHour }: { medId: string; startHour: number }) => {
      const newStart = new Date();
      newStart.setHours(startHour, 0, 0, 0);
      return api.put(`/medications/${medId}/schedule`, { newStartTime: newStart.toISOString() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications", selectedId] });
      qc.invalidateQueries({ queryKey: ["patient-schedule", selectedId] });
      setEditingMedId(null);
      setSuccessMsg("Horario guardado correctamente");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
  });

  const onSubmit = (data: PrescriptionForm) => {
    if (!selectedId) return;
    prescriptionMutation.mutate({ ...data, patientId: selectedId });
  };

  const pendingMeds = medications.filter((m) => m.active).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Vista Médico
        </h1>
        <p className="text-slate-500 text-sm font-medium mt-1">
          Prescripción de medicación · Historial clínico
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-blue-500 p-5 text-white shadow-lg shadow-blue-100">
          <p className="text-blue-100 text-xs font-bold uppercase tracking-wide mb-1">
            Pacientes
          </p>
          <p className="text-3xl font-black">{patients.length}</p>
          <User className="w-5 h-5 text-blue-200 mt-2" />
        </div>
        <div
          className={`rounded-2xl p-5 text-white shadow-lg ${pendingMeds > 0 ? "bg-red-500 shadow-red-100" : "bg-emerald-500 shadow-emerald-100"}`}
        >
          <p className="text-white/70 text-xs font-bold uppercase tracking-wide mb-1">
            Medicación activa
          </p>
          <p className="text-3xl font-black">{pendingMeds}</p>
          <Pill className="w-5 h-5 text-white/60 mt-2" />
        </div>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-medium">
          No se pudieron cargar los pacientes. Verifica que el backend esté
          activo.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
                const hasAllergy = getAllergiesCount(p.allergies) > 0;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => {
                        setSelectedId(p.id);
                        setSuccessMsg("");
                        setShowForm(false);
                        setEditingMedId(null);
                      }}
                      className={`w-full text-left px-4 py-3 transition-all hover:bg-slate-50 border-l-4 ${isSelected ? "bg-blue-50 border-blue-500" : hasAllergy ? "border-red-300" : "border-transparent"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {p.name} {p.surnames}
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
                        </div>
                        {hasAllergy && (
                          <span className="text-[10px] bg-red-500 text-white font-black px-1.5 py-0.5 rounded shrink-0">
                            🚫 {getAllergiesCount(p.allergies)}
                          </span>
                        )}
                      </div>
                      {p.bed && (
                        <p className="text-[10px] text-slate-400 font-bold mt-1">
                          Hab. {p.bed.room}
                          {p.bed.letter}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <User className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">
                Selecciona un paciente para gestionar su medicación
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-900 px-5 py-4 flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                    {new Date().getFullYear() -
                      new Date(selected.dob).getFullYear() >=
                    65
                      ? "👴"
                      : "🧑"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-black text-white text-base">
                        {selected.name} {selected.surnames}
                      </h2>
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
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selected.bed
                        ? `Hab. ${selected.bed.room}${selected.bed.letter}`
                        : "Sin cama"}{" "}
                      · Ingreso:{" "}
                      {new Date(selected.admissionDate).toLocaleDateString(
                        "es-ES",
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowForm((v) => !v)}
                    className={`ml-auto flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${showForm ? "bg-slate-200 text-slate-700" : "bg-white text-slate-900 hover:bg-slate-100"}`}
                  >
                    {showForm ? (
                      <X className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    {showForm ? "Cancelar" : "Prescribir"}
                  </button>
                </div>

                {getAllergiesCount(selected.allergies) > 0 && (
                  <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-red-700">Alergias</p>
                      <p className="text-xs text-red-600">
                        {parseAllergies(selected.allergies).join(", ")}
                      </p>
                    </div>
                  </div>
                )}

                {showForm && (
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="p-5 space-y-3 border-t border-slate-100"
                  >
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <Pill className="w-4 h-4 text-blue-500" />
                      Nueva prescripción
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Medicamento *
                        </label>
                        <input
                          type="text"
                          placeholder="ej: Paracetamol 1g"
                          {...register("drugName")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20"
                        />
                        {errors.drugName && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.drugName.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Nº Registro (CIMA)
                        </label>
                        <input
                          type="text"
                          placeholder="ej: 12345"
                          {...register("nregistro")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Dosis *
                        </label>
                        <input
                          type="text"
                          placeholder="ej: 1 comprimido"
                          {...register("dose")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20"
                        />
                        {errors.dose && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.dose.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Vía administración
                        </label>
                        <select
                          {...register("route")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20"
                        >
                          {ROUTE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        {errors.route && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.route.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Frecuencia
                        </label>
                        <select
                          {...register("frequencyHrs", { valueAsNumber: true })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20"
                        >
                          {FREQ_OPTIONS.map((h) => (
                            <option key={h} value={h}>
                              Cada {h} horas
                            </option>
                          ))}
                        </select>
                        {errors.frequencyHrs && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.frequencyHrs.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Hora inicio *
                        </label>
                        <input
                          type="datetime-local"
                          {...register("startTime")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20"
                        />
                        {errors.startTime && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.startTime.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          {...register("indefinite")}
                          className="w-4 h-4 rounded accent-blue-600"
                        />
                        <span className="text-xs font-bold text-slate-600">Tratamiento indefinido</span>
                      </label>
                    </div>
                    {!isIndefinite && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Fecha fin
                        </label>
                        <input
                          type="date"
                          {...register("endDate")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20"
                        />
                      </div>
                    )}
                    {prescriptionMutation.isError && (
                      <p className="text-xs text-red-600 font-medium">
                        {prescriptionMutation.error.message}
                      </p>
                    )}
                    {successMsg && (
                      <p className="text-xs text-emerald-600 font-medium">
                        {successMsg}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={prescriptionMutation.isPending}
                      className="flex items-center gap-2 bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
                    >
                      {prescriptionMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Confirmar prescripción
                    </button>
                  </form>
                )}
              </div>

              <div className="bg-white border border-slate-200 border-t-4 border-t-orange-400 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-xl bg-orange-500 flex items-center justify-center">
                    <Pill className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="font-black text-slate-900">
                    Medicación activa
                  </h3>
                </div>

                {loadingMeds ? (
                  <div className="flex justify-center p-6">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                  </div>
                ) : medications.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center p-6">
                    Sin medicación activa
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {medications.map((m) => {
                      const isEditing = editingMedId === m.id;
                      return (
                        <div key={m.id} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-slate-900 text-sm">{m.drugName}</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${m.active ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-600"}`}>
                                  {m.active ? "ACTIVO" : "SUSPENDIDO"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-medium mt-0.5">
                                {m.dose} · {m.route} · cada {m.frequencyHrs}h
                              </p>
                              {m.nregistro && (
                                <p className="text-[10px] text-slate-400 mt-0.5">Reg: {m.nregistro}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {m.active && (
                                <button
                                  onClick={() => {
                                    if (isEditing) { setEditingMedId(null); return; }
                                    setEditStartHour(new Date(m.startTime).getHours());
                                    setEditingMedId(m.id);
                                  }}
                                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors font-bold"
                                >
                                  {isEditing ? <X className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                                  {isEditing ? "Cancelar" : "Horario"}
                                </button>
                              )}
                              {m.active && (
                                <button
                                  onClick={() => { if (confirm("¿Suspender esta medicación?")) deactivateMutation.mutate(m.id); }}
                                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-bold"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Suspender
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Inicio:{" "}
                            {new Date(m.startTime).toLocaleString("es-ES", {
                              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                          {isEditing && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">
                              <p className="text-xs font-black text-amber-800 uppercase tracking-wide mb-2">Cambiar hora de inicio</p>
                              <div className="flex gap-3 mb-2">
                                <div className="flex-1">
                                  <label className="block text-xs font-bold text-amber-700 mb-1">Nueva hora de inicio</label>
                                  <select
                                    value={editStartHour}
                                    onChange={(e) => setEditStartHour(Number(e.target.value))}
                                    className="w-full bg-white border border-amber-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 ring-amber-400/30"
                                  >
                                    {Array.from({ length: 24 }, (_, i) => (
                                      <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <p className="text-xs text-amber-700 font-medium mb-2">
                                Horarios resultantes (cada {m.frequencyHrs}h):{" "}
                                {Array.from(
                                  { length: Math.ceil((24 - editStartHour) / m.frequencyHrs) },
                                  (_, i) => editStartHour + i * m.frequencyHrs,
                                )
                                  .filter((h) => h < 24)
                                  .map((h) => `${String(h).padStart(2, "0")}:00`)
                                  .join(" · ")}
                              </p>
                              <button
                                onClick={() => scheduleUpdateMutation.mutate({ medId: m.id, startHour: editStartHour })}
                                disabled={scheduleUpdateMutation.isPending}
                                className="flex items-center gap-1.5 bg-amber-500 text-white text-xs font-black px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                              >
                                {scheduleUpdateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Guardar horario
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DOC-RF1: Cronograma del día — usa el mismo componente unificado que la enfermera */}
              <PatientSchedule patientId={selected.id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
