import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Pill, Clock, CheckCircle2, AlertTriangle, Loader2, Sunrise, Sun, Moon,
} from "lucide-react";
import { api } from "@/lib/api";
import { getShiftWindows, type ShiftKey } from "@/pages/NursePage";
import type { Medication, MedSchedule } from "@/lib/types";

// Tarea D del feedback: vista de cronograma centrada en el trabajo inmediato
// del enfermero — turno anterior + turno actual + turno siguiente.
// Las dosis fuera de esas 3 ventanas no se muestran aquí (sí en PatientSchedule
// del paciente con navegación por día).

interface NurseShiftCronogramProps {
  patientId: string;
  medications: Medication[];
}

const SHIFT_META: Record<ShiftKey, { label: string; icon: typeof Pill; bg: string; text: string }> = {
  morning:   { label: "Mañana (07-15)", icon: Sunrise, bg: "bg-amber-50 border-amber-200",   text: "text-amber-700" },
  afternoon: { label: "Tarde (15-23)",  icon: Sun,     bg: "bg-orange-50 border-orange-200", text: "text-orange-700" },
  night:     { label: "Noche (23-07)",  icon: Moon,    bg: "bg-indigo-50 border-indigo-200", text: "text-indigo-700" },
};

function getCurrentShiftKey(): ShiftKey {
  const h = new Date().getHours();
  if (h >= 7 && h < 15) return "morning";
  if (h >= 15 && h < 23) return "afternoon";
  return "night";
}

function previousShift(current: ShiftKey): ShiftKey {
  if (current === "morning") return "night";
  if (current === "afternoon") return "morning";
  return "afternoon";
}

function nextShift(current: ShiftKey): ShiftKey {
  if (current === "morning") return "afternoon";
  if (current === "afternoon") return "night";
  return "morning";
}

interface DoseRow {
  medId: string;
  drugName: string;
  dose: string;
  route: string;
  schedule: MedSchedule;
}

function getDosesInWindow(
  medications: Medication[],
  win: { start: Date; end: Date }
): DoseRow[] {
  const rows: DoseRow[] = [];
  for (const med of medications) {
    if (!med.active) continue;
    for (const sched of med.schedules ?? []) {
      const t = new Date(sched.scheduledAt).getTime();
      if (t >= win.start.getTime() && t <= win.end.getTime()) {
        rows.push({
          medId: med.id,
          drugName: med.drugName,
          dose: med.dose,
          route: med.route,
          schedule: sched,
        });
      }
    }
  }
  // dedup por scheduleId
  const seen = new Set<string>();
  return rows
    .filter((r) => {
      if (seen.has(r.schedule.id)) return false;
      seen.add(r.schedule.id);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(a.schedule.scheduledAt).getTime() -
        new Date(b.schedule.scheduledAt).getTime()
    );
}

function isAdministrable(timestampISO: string): boolean {
  const t = new Date(timestampISO).getTime();
  const now = Date.now();
  return t <= now + 60 * 60 * 1000 && t >= now - 24 * 60 * 60 * 1000;
}

export function NurseShiftCronogram({
  patientId,
  medications,
}: NurseShiftCronogramProps) {
  const qc = useQueryClient();
  const shiftWindows = getShiftWindows();
  const currentKey = getCurrentShiftKey();

  // Orden visual: anterior → actual → siguiente
  const orderedShifts: ShiftKey[] = [
    previousShift(currentKey),
    currentKey,
    nextShift(currentKey),
  ];

  const administerMutation = useMutation({
    mutationFn: (scheduleId: string) =>
      api.post(`/medications/schedules/${scheduleId}/administer`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications", patientId] });
      qc.invalidateQueries({ queryKey: ["patient-schedule", patientId] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
  });

  return (
    <div className="bg-white border border-slate-200 border-t-4 border-t-purple-400 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <div className="w-7 h-7 rounded-xl bg-purple-500 flex items-center justify-center">
          <Clock className="w-3.5 h-3.5 text-white" />
        </div>
        <h3 className="font-black text-slate-900">Próximas 24h por turno</h3>
        <span className="text-[10px] bg-purple-100 text-purple-700 font-black px-2 py-0.5 rounded-full ml-auto">
          Turno anterior · actual · siguiente
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {orderedShifts.map((key) => {
          const win = shiftWindows[key];
          const meta = SHIFT_META[key];
          const Icon = meta.icon;
          const doses = getDosesInWindow(medications, win);
          const isCurrent = key === currentKey;

          return (
            <div key={key} className="p-4">
              <div className={`flex items-center gap-2 mb-2 ${meta.text}`}>
                <Icon className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-wide">
                  {meta.label}
                </span>
                {isCurrent && (
                  <span className="text-[10px] bg-blue-500 text-white font-black px-2 py-0.5 rounded-full">
                    AHORA
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-bold ml-auto">
                  {win.start.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                </span>
              </div>

              {doses.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Sin dosis programadas en este turno</p>
              ) : (
                <ul className="space-y-1.5">
                  {doses.map((d) => {
                    const time = new Date(d.schedule.scheduledAt).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const administered = !!d.schedule.administeredAt;
                    const canAdminister =
                      !administered && isAdministrable(d.schedule.scheduledAt);

                    return (
                      <li
                        key={d.schedule.id}
                        className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                          administered
                            ? "bg-emerald-50 border-emerald-100"
                            : canAdminister
                            ? meta.bg
                            : "bg-slate-50 border-slate-100"
                        }`}
                      >
                        <div className="w-14 text-center shrink-0">
                          <p className="text-xs font-black text-slate-700">{time}</p>
                        </div>
                        <Pill className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {d.drugName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {d.dose} · {d.route}
                          </p>
                        </div>
                        {administered ? (
                          <span className="text-[10px] font-black text-emerald-700 bg-white px-2 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Administrada
                          </span>
                        ) : canAdminister ? (
                          <button
                            onClick={() => administerMutation.mutate(d.schedule.id)}
                            disabled={administerMutation.isPending}
                            className="shrink-0 flex items-center gap-1 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                          >
                            {administerMutation.isPending &&
                            administerMutation.variables === d.schedule.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            Administrar
                          </button>
                        ) : (
                          <span
                            className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-200 flex items-center gap-1"
                            title="Fuera de tu turno administrable (24h pasado / 1h futuro)"
                          >
                            <AlertTriangle className="w-3 h-3" /> Fuera de ventana
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
