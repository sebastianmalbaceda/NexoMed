import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Pill,
  Activity,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Filter,
  User,
  TestTube,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; icon: string; label: string }
> = {
  completed: {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    icon: "✅",
    label: "Completado",
  },
  delayed: {
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
    icon: "⚠️",
    label: "Retrasado",
  },
  pending: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    icon: "⏳",
    label: "Pendiente",
  },
};

interface ScheduleItem {
  id: string;
  source: "MEDICATION" | "CARE_RECORD" | "DIAGNOSTIC_TEST";
  type: string;
  timestamp: string;
  status: "completed" | "delayed" | "pending";
  patientId: string;
  patientName: string;
  assignedNurseId: string | null;
  room: string | null;
  title: string;
  details: string;
  metadata?: Record<string, unknown>;
}

interface NurseOption {
  id: string;
  name: string;
  role: string;
}

export default function NurseShiftSchedulePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [selectedShift, setSelectedShift] = useState<string>(() => {
    const h = new Date().getHours();
    if (h >= 7 && h < 15) return "morning";
    if (h >= 15 && h < 23) return "afternoon";
    return "night";
  });
  const [filterStatus, setFilterStatus] = useState<string>("");
  // SYS-RF5: '' = todas, 'me' = mis tareas (enfermero actual), o uuid de enfermero
  const [groupByPatient, setGroupByPatient] = useState(false);
  const [nurseFilter, setNurseFilter] = useState<string>(
    user?.role === "NURSE" ? "me" : "",
  );

  const shiftKey = selectedShift as
    | "morning"
    | "afternoon"
    | "night"
    | undefined;

  const { data: nurses = [] } = useQuery({
    queryKey: ["nurses"],
    queryFn: () => api.get<NurseOption[]>("/users/nurses"),
    enabled: user?.role === "DOCTOR",
  });

  const effectiveNurseId =
    nurseFilter === "me" ? (user?.id ?? "") : nurseFilter;

  const {
    data: scheduleItems = [],
    isLoading,
    isError: scheduleError,
  } = useQuery({
    queryKey: ["schedule", selectedDate, selectedShift, effectiveNurseId],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("date", selectedDate);
      if (shiftKey) params.set("shift", shiftKey);
      if (effectiveNurseId) params.set("nurseId", effectiveNurseId);
      return api.get<ScheduleItem[]>(`/schedule?${params.toString()}`);
    },
  });

  const administerMutation = useMutation({
    mutationFn: (scheduleId: string) =>
      api.post(`/medications/schedules/${scheduleId}/administer`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["medications"] });
    },
  });

  const filteredItems = scheduleItems.filter((item) => {
    if (filterStatus && item.status !== filterStatus) return false;
    return true;
  });

  const medicationItems = filteredItems.filter(
    (i) => i.source === "MEDICATION",
  );
  const careItems = filteredItems.filter((i) => i.source === "CARE_RECORD");
  const testItems = filteredItems.filter((i) => i.source === "DIAGNOSTIC_TEST");
  const patientGroups = (() => {
    const groups = new Map();
    for (const item of filteredItems) {
      const key = item.patientId;
      if (!groups.has(key))
        groups.set(key, {
          patientName: item.patientName,
          room: item.room,
          items: [],
        });
      groups.get(key).items.push(item);
    }
    return Array.from(groups.values()).sort((a, b) =>
      a.patientName.localeCompare(b.patientName),
    );
  })();

  const completedCount = filteredItems.filter(
    (i) => i.status === "completed",
  ).length;
  const pendingCount = filteredItems.filter(
    (i) => i.status === "pending",
  ).length;
  const delayedCount = filteredItems.filter(
    (i) => i.status === "delayed",
  ).length;

  const goPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const goNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const displayDate = new Date(selectedDate + "T12:00:00");
  const formattedDate = displayDate.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Cronograma de Turno
        </h1>
        <p className="text-slate-500 text-sm font-medium mt-1">
          Vista general de tareas · Medicación y cuidados
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-blue-500 p-5 text-white shadow-lg shadow-blue-100">
          <p className="text-blue-100 text-xs font-bold uppercase tracking-wide mb-1">
            Total tareas
          </p>
          <p className="text-3xl font-black">{filteredItems.length}</p>
          <Clock className="w-5 h-5 text-blue-200 mt-2" />
        </div>
        <div className="rounded-2xl bg-emerald-500 p-5 text-white shadow-lg shadow-emerald-100">
          <p className="text-emerald-100 text-xs font-bold uppercase tracking-wide mb-1">
            Completadas
          </p>
          <p className="text-3xl font-black">{completedCount}</p>
          <CheckCircle2 className="w-5 h-5 text-emerald-200 mt-2" />
        </div>
        <div className="rounded-2xl bg-amber-500 p-5 text-white shadow-lg shadow-amber-100">
          <p className="text-amber-100 text-xs font-bold uppercase tracking-wide mb-1">
            Pendientes
          </p>
          <p className="text-3xl font-black">{pendingCount}</p>
          <AlertCircle className="w-5 h-5 text-amber-200 mt-2" />
        </div>
        <div className="rounded-2xl bg-red-500 p-5 text-white shadow-lg shadow-red-100">
          <p className="text-red-100 text-xs font-bold uppercase tracking-wide mb-1">
            Retrasadas
          </p>
          <p className="text-3xl font-black">{delayedCount}</p>
          <AlertTriangle className="w-5 h-5 text-red-200 mt-2" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={goPrevDay}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div className="flex items-center gap-2 min-w-[200px]">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-800 capitalize">
                {formattedDate}
              </span>
            </div>
            <button
              onClick={goNextDay}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <Filter className="w-4 h-4 text-slate-400" />
            <button
              onClick={() => setGroupByPatient((v) => !v)}
              className={`text-xs font-bold px-3 py-2 rounded-lg transition-colors ${groupByPatient ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {groupByPatient ? "Por tipo" : "Por paciente"}
            </button>
            {/* SYS-RF5: filtro por enfermero */}
            {user?.role === "NURSE" && (
              <select
                value={nurseFilter}
                onChange={(e) => setNurseFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20"
              >
                <option value="me">Mis tareas</option>
                <option value="">Todas las tareas</option>
              </select>
            )}
            {user?.role === "DOCTOR" && (
              <select
                value={nurseFilter}
                onChange={(e) => setNurseFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20 min-w-[180px]"
              >
                <option value="">Todos los enfermeros</option>
                {nurses.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            )}
            {user?.role === "NURSE" ? (
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-lg">
                {selectedShift === "morning"
                  ? "🌅 Turno Mañana"
                  : selectedShift === "afternoon"
                    ? "🌆 Turno Tarde"
                    : "🌙 Turno Noche"}
              </span>
            ) : (
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20"
              >
                <option value="">Todos los turnos</option>
                <option value="morning">Mañana (7-15h)</option>
                <option value="afternoon">Tarde (15-23h)</option>
                <option value="night">Noche (23-7h)</option>
              </select>
            )}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20"
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="completed">Completado</option>
              <option value="delayed">Retrasado</option>
            </select>
          </div>
        </div>
      </div>

      {scheduleError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-medium">
          Error al cargar el cronograma. Verifica que el backend esté activo.
        </div>
      )}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 bg-white border border-slate-200 rounded-2xl">
          <Calendar className="w-12 h-12 opacity-30" />
          <p className="font-medium">
            No hay tareas{selectedShift ? ` para este turno` : ""}
            {filterStatus ? ` con este estado` : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {medicationItems.length > 0 && (
            <div className="bg-white border border-slate-200 border-t-4 border-t-orange-400 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
                  <Pill className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-black text-slate-900">Medicación</h3>
                <span className="ml-auto text-xs bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                  {medicationItems.length}
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {medicationItems.map((item) => {
                  const statusStyle = STATUS_STYLES[item.status];
                  const time = new Date(item.timestamp).toLocaleTimeString(
                    "es-ES",
                    { hour: "2-digit", minute: "2-digit" },
                  );

                  return (
                    <li
                      key={item.id}
                      className={`px-5 py-4 ${statusStyle.bg} border-l-4 ${item.status === "completed" ? "border-l-emerald-400" : item.status === "delayed" ? "border-l-red-400" : "border-l-amber-400"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-black text-slate-900">
                              {item.title}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusStyle.text} bg-white/60`}
                            >
                              {statusStyle.icon} {statusStyle.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            {item.details}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                              <Clock className="w-3 h-3" />
                              {time}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                              <User className="w-3 h-3" />
                              {item.patientName}
                            </span>
                            {item.room && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                                Hab. {item.room}
                              </span>
                            )}
                          </div>
                        </div>
                        {item.status !== "completed" &&
                          user?.role === "NURSE" && (
                            <button
                              onClick={() => administerMutation.mutate(item.id)}
                              disabled={administerMutation.isPending}
                              className="shrink-0 flex items-center gap-1 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Administrar
                            </button>
                          )}
                        {item.status === "completed" && (
                          <span className="shrink-0 text-[10px] text-emerald-600 font-bold bg-emerald-100 px-2 py-1 rounded-full">
                            ✓ Completado
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {careItems.length > 0 && (
            <div className="bg-white border border-slate-200 border-t-4 border-t-blue-400 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-black text-slate-900">
                  Cuidados y Constantes
                </h3>
                <span className="ml-auto text-xs bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                  {careItems.length}
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {careItems.map((item) => {
                  const time = new Date(item.timestamp).toLocaleTimeString(
                    "es-ES",
                    { hour: "2-digit", minute: "2-digit" },
                  );

                  return (
                    <li
                      key={item.id}
                      className="px-5 py-4 bg-emerald-50/30 border-l-4 border-l-emerald-400"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-black text-slate-900">
                              {item.title}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-100">
                              ✅ Completado
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            {item.details}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                              <Clock className="w-3 h-3" />
                              {time}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                              <User className="w-3 h-3" />
                              {item.patientName}
                            </span>
                            {item.room && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                                Hab. {item.room}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {testItems.length > 0 && (
            <div className="bg-white border border-slate-200 border-t-4 border-t-violet-400 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-violet-500 flex items-center justify-center">
                  <TestTube className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-black text-slate-900">
                  Pruebas Diagnósticas
                </h3>
                <span className="ml-auto text-xs bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                  {testItems.length}
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {testItems.map((item) => {
                  const statusStyle =
                    STATUS_STYLES[item.status] ?? STATUS_STYLES.pending;
                  const time = new Date(item.timestamp).toLocaleTimeString(
                    "es-ES",
                    { hour: "2-digit", minute: "2-digit" },
                  );
                  return (
                    <li
                      key={item.id}
                      className={`px-5 py-4 bg-violet-50/30 border-l-4 ${item.status === "completed" ? "border-l-emerald-400" : item.status === "delayed" ? "border-l-red-400" : "border-l-violet-400"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-black text-slate-900">
                              {item.title}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusStyle.text} bg-white/60`}
                            >
                              {statusStyle.icon} {statusStyle.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            {item.details}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                              <Clock className="w-3 h-3" />
                              {time}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                              <User className="w-3 h-3" />
                              {item.patientName}
                            </span>
                            {item.room && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                                Hab. {item.room}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
