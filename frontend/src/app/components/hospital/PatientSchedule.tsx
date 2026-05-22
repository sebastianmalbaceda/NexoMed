import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, Pill, Activity, TestTube, AlertCircle, AlertTriangle,
  CheckCircle2, Loader2, Calendar, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

// SYS-RF6: cronograma de las tareas a realizarle al paciente dentro de su perfil.

interface ScheduleItem {
  id: string;
  source: 'MEDICATION' | 'CARE_RECORD' | 'DIAGNOSTIC_TEST';
  type: string;
  timestamp: string;
  status: 'completed' | 'delayed' | 'pending';
  patientId: string;
  patientName: string;
  assignedNurseId: string | null;
  room: string | null;
  title: string;
  details: string;
}

interface TimelineItem {
  id: string;
  source: 'MEDICATION' | 'CARE_RECORD' | 'DIAGNOSTIC_TEST';
  timestamp: string;
  status: 'completed' | 'pending' | 'delayed' | 'cancelled';
  title: string;
  details: string;
  scheduleId?: string;
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; icon: string; label: string }> = {
  completed: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: '✅', label: 'Completado' },
  delayed:   { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     icon: '⚠️', label: 'Retrasado' },
  pending:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   icon: '⏳', label: 'Pendiente' },
  cancelled: { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-500',   icon: '🚫', label: 'Cancelado' },
};

const SOURCE_STYLES: Record<string, { color: string; icon: typeof Pill }> = {
  MEDICATION:      { color: 'border-l-orange-400 bg-orange-50/30', icon: Pill },
  CARE_RECORD:     { color: 'border-l-emerald-400 bg-emerald-50/30', icon: Activity },
  DIAGNOSTIC_TEST: { color: 'border-l-violet-400 bg-violet-50/30', icon: TestTube },
};

const SOURCE_LABELS: Record<string, string> = {
  MEDICATION: 'Medicación',
  CARE_RECORD: 'Cuidado',
  DIAGNOSTIC_TEST: 'Prueba diagnóstica',
};

function getCurrentShiftRange(): { start: Date; end: Date } {
  const now = new Date();
  const h = now.getHours();
  const start = new Date(now);
  const end = new Date(now);
  if (h >= 7 && h < 15) {
    start.setHours(7, 0, 0, 0); end.setHours(14, 59, 59, 999);
  } else if (h >= 15 && h < 23) {
    start.setHours(15, 0, 0, 0); end.setHours(22, 59, 59, 999);
  } else if (h >= 23) {
    start.setHours(23, 0, 0, 0);
    const nd = new Date(now); nd.setDate(nd.getDate() + 1); nd.setHours(6, 59, 59, 999);
    return { start, end: nd };
  } else {
    const pd = new Date(now); pd.setDate(pd.getDate() - 1); pd.setHours(23, 0, 0, 0);
    end.setHours(6, 59, 59, 999);
    return { start: pd, end };
  }
  return { start, end };
}

export function PatientSchedule({ patientId }: { patientId: string }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: scheduleItems = [], isLoading: loadingSchedule } = useQuery({
    queryKey: ['patient-schedule', patientId, selectedDate],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('date', selectedDate);
      params.set('patientId', patientId);
      return api.get<ScheduleItem[]>(`/schedule?${params.toString()}`);
    },
    enabled: !!patientId,
  });

  const [administerError, setAdministerError] = useState<string>('');

  const administerMutation = useMutation({
    mutationFn: (scheduleId: string) =>
      api.post(`/medications/schedules/${scheduleId}/administer`, {}),
    onSuccess: () => {
      setAdministerError('');
      qc.invalidateQueries({ queryKey: ['patient-schedule', patientId] });
      qc.invalidateQueries({ queryKey: ['medications', patientId] });
      qc.invalidateQueries({ queryKey: ['schedule'] });
    },
    onError: (e: Error) => setAdministerError(e.message),
  });

  const allItems: TimelineItem[] = scheduleItems
    .map((s) => ({
      id: s.id,
      source: s.source,
      timestamp: s.timestamp,
      status: s.status,
      title: s.title,
      details: s.details,
      scheduleId: s.source === 'MEDICATION' ? s.id : undefined,
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const counts = {
    pending: allItems.filter((i) => i.status === 'pending').length,
    delayed: allItems.filter((i) => i.status === 'delayed').length,
    completed: allItems.filter((i) => i.status === 'completed').length,
  };

  const goPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };
  const goNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };
  const goToday = () => setSelectedDate(new Date().toISOString().split('T')[0]);

  const displayDate = new Date(`${selectedDate}T12:00:00`);
  const formattedDate = displayDate.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const isLoading = loadingSchedule;
  const canAdminister = user?.role === 'NURSE';
  const shiftRange = getCurrentShiftRange();

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-gradient-to-r from-blue-50 to-violet-50">
        <Calendar className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-foreground">Cronograma del paciente</h3>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={goPrevDay} className="p-1.5 hover:bg-white rounded-lg transition-colors" title="Día anterior">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-xs font-bold text-slate-700 capitalize min-w-[170px] text-center">
            {formattedDate}
          </span>
          <button onClick={goNextDay} className="p-1.5 hover:bg-white rounded-lg transition-colors" title="Día siguiente">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
          {!isToday && (
            <button onClick={goToday} className="text-[10px] bg-blue-600 text-white font-bold px-2 py-1 rounded-lg hover:bg-blue-700 transition-colors">
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 p-3 border-b border-border bg-slate-50/50">
        <div className="bg-white rounded-lg p-2 text-center border border-amber-100">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Pendientes</p>
          <p className="text-lg font-black text-amber-700">{counts.pending}</p>
        </div>
        <div className="bg-white rounded-lg p-2 text-center border border-red-100">
          <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Retrasadas</p>
          <p className="text-lg font-black text-red-700">{counts.delayed}</p>
        </div>
        <div className="bg-white rounded-lg p-2 text-center border border-emerald-100">
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Completadas</p>
          <p className="text-lg font-black text-emerald-700">{counts.completed}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4 max-h-[480px] overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
          </div>
        ) : allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
            <Calendar className="w-8 h-8 opacity-30" />
            <p className="text-sm font-medium">Sin tareas programadas para este día</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {allItems.map((item) => {
              const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending;
              const sourceStyle = SOURCE_STYLES[item.source];
              const SourceIcon = sourceStyle.icon;
              const time = new Date(item.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

              return (
                <li
                  key={item.id}
                  className={`rounded-xl border-l-4 ${sourceStyle.color} border border-slate-100 p-3`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-12 text-center">
                      <Clock className="w-3 h-3 text-slate-400 mx-auto mb-0.5" />
                      <p className="text-xs font-black text-slate-700">{time}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <SourceIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          {SOURCE_LABELS[item.source]}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusStyle.text} bg-white/80 border ${statusStyle.border}`}>
                          {statusStyle.icon} {statusStyle.label}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.details}</p>
                    </div>
                    {item.source === 'MEDICATION' &&
                      item.status !== 'completed' &&
                      canAdminister &&
                      item.scheduleId &&
                      new Date(item.timestamp) >= shiftRange.start &&
                      new Date(item.timestamp) <= shiftRange.end && (
                        <button
                          onClick={() => administerMutation.mutate(item.scheduleId!)}
                          disabled={administerMutation.isPending}
                          className="shrink-0 flex items-center gap-1 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                          title="Marcar como administrado"
                        >
                          {administerMutation.isPending && administerMutation.variables === item.scheduleId ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          Administrar
                        </button>
                      )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Leyenda */}
      <div className="px-4 py-2 border-t border-border bg-slate-50/50 flex items-center justify-center gap-4 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
          <span className="w-2 h-2 rounded-full bg-orange-400" /> Medicación
        </span>
        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400" /> Cuidado
        </span>
        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
          <span className="w-2 h-2 rounded-full bg-violet-400" /> Prueba diagnóstica
        </span>
      </div>

      {administerError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <p className="text-[11px] text-red-700 font-bold">{administerError}</p>
        </div>
      )}
      {counts.delayed > 0 && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <p className="text-[11px] text-red-700 font-bold">
            {counts.delayed} tarea{counts.delayed !== 1 ? 's' : ''} retrasada{counts.delayed !== 1 ? 's' : ''} requieren atención
          </p>
        </div>
      )}
      {counts.delayed === 0 && counts.pending > 0 && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p className="text-[11px] text-amber-700 font-bold">
            {counts.pending} tarea{counts.pending !== 1 ? 's' : ''} pendiente{counts.pending !== 1 ? 's' : ''} para hoy
          </p>
        </div>
      )}
    </div>
  );
}
