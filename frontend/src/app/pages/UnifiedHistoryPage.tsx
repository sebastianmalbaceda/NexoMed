import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  History, Loader2, ChevronDown, Clock, Pill, Activity, FileText, User,
  TestTube, AlertTriangle, ShieldCheck, Calendar, Stethoscope, LogIn, LogOut,
} from 'lucide-react';
import { api } from '@/lib/api';
import { CARE_RECORD_TYPE_LABELS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { parseAllergies, getAllergiesCount, fullName } from '@/lib/patientUtils';
import type { Patient, CareRecord, Medication, DiagnosticTest, Incident } from '@/lib/types';

// Historial clínico estilo hospital realista — Punto 1 del feedback.
// Combina cronología unificada de toda la actividad clínica del paciente,
// separa "Visita actual" (desde admissionDate) y "Visitas anteriores".

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  ESTABLE: { label: 'Estable', dot: 'bg-emerald-500', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  OBSERVACION: { label: 'Observación', dot: 'bg-amber-500', bg: 'bg-amber-100', text: 'text-amber-700' },
  MODERADO: { label: 'Moderado', dot: 'bg-orange-500', bg: 'bg-orange-100', text: 'text-orange-700' },
  CRITICO: { label: 'Crítico', dot: 'bg-red-500', bg: 'bg-red-100', text: 'text-red-700' },
};

type EventKind = 'admission' | 'discharge' | 'care' | 'med-given' | 'med-pending' | 'test' | 'incident';

interface TimelineEvent {
  id: string;
  kind: EventKind;
  timestamp: string;
  title: string;
  detail: string;
  author?: string;
  meta?: string;
}

const KIND_STYLES: Record<EventKind, { dot: string; icon: typeof Activity; label: string; ringColor: string }> = {
  admission:   { dot: 'bg-blue-600',    icon: LogIn,        label: 'Ingreso',           ringColor: 'ring-blue-100' },
  discharge:   { dot: 'bg-slate-700',   icon: LogOut,       label: 'Alta médica',       ringColor: 'ring-slate-100' },
  care:        { dot: 'bg-emerald-500', icon: Activity,     label: 'Cuidado',           ringColor: 'ring-emerald-100' },
  'med-given': { dot: 'bg-orange-500',  icon: Pill,         label: 'Dosis administrada', ringColor: 'ring-orange-100' },
  'med-pending': { dot: 'bg-amber-400', icon: Pill,         label: 'Dosis programada',  ringColor: 'ring-amber-100' },
  test:        { dot: 'bg-violet-500',  icon: TestTube,     label: 'Prueba diagnóstica', ringColor: 'ring-violet-100' },
  incident:    { dot: 'bg-red-500',     icon: AlertTriangle, label: 'Incidencia',        ringColor: 'ring-red-100' },
};

const FILTER_LABELS: Record<Exclude<EventKind, 'admission' | 'discharge'>, string> = {
  care: 'Cuidados',
  'med-given': 'Medicación administrada',
  'med-pending': 'Medicación pendiente',
  test: 'Pruebas',
  incident: 'Incidencias',
};

const SEVERITY_BADGE: Record<string, { bg: string; label: string }> = {
  LEVE:     { bg: 'bg-emerald-500', label: 'LEVE' },
  MODERADA: { bg: 'bg-amber-500',   label: 'MODERADA' },
  GRAVE:    { bg: 'bg-orange-500',  label: 'GRAVE' },
  CRITICA:  { bg: 'bg-red-600',     label: 'CRÍTICA' },
};

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function ageFromDob(dob: string): number {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export default function UnifiedHistoryPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [visitMode, setVisitMode] = useState<'current' | 'previous' | 'all'>('current');
  const [activeFilters, setActiveFilters] = useState<Set<Exclude<EventKind, 'admission' | 'discharge'>>>(
    new Set(['care', 'med-given', 'med-pending', 'test', 'incident'])
  );

  useEffect(() => {
    const pid = searchParams.get('patientId');
    if (pid) setSelectedPatientId(pid);
  }, [searchParams]);

  const { data: patients = [], isLoading: loadingPatients, isError: patientsError } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get<Patient[]>('/patients'),
  });

  const { data: careRecords = [], isLoading: loadingCares } = useQuery({
    queryKey: ['care-records', selectedPatientId],
    queryFn: () => api.get<CareRecord[]>(`/cares/${selectedPatientId}`),
    enabled: selectedPatientId !== '',
  });

  const { data: medications = [], isLoading: loadingMeds } = useQuery({
    queryKey: ['medications-history', selectedPatientId],
    queryFn: () => api.get<Medication[]>(`/medications/${selectedPatientId}`),
    enabled: selectedPatientId !== '' && (user?.role === 'DOCTOR' || user?.role === 'NURSE'),
  });

  const { data: diagnosticTests = [], isLoading: loadingTests } = useQuery({
    queryKey: ['tests-history', selectedPatientId],
    queryFn: () => api.get<DiagnosticTest[]>(`/tests/${selectedPatientId}`),
    enabled: selectedPatientId !== '',
  });

  const { data: incidents = [], isLoading: loadingIncidents } = useQuery({
    queryKey: ['incidents-history', selectedPatientId],
    queryFn: () => api.get<Incident[]>(`/incidents/${selectedPatientId}`),
    enabled: selectedPatientId !== '',
  });

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);
  const isDoctor = user?.role === 'DOCTOR';

  // ─── Construir línea temporal unificada ─────────────────────────────────
  const allEvents: TimelineEvent[] = useMemo(() => {
    if (!selectedPatient) return [];
    const ev: TimelineEvent[] = [];

    // Hito de ingreso
    ev.push({
      id: `admission-${selectedPatient.id}`,
      kind: 'admission',
      timestamp: selectedPatient.admissionDate,
      title: 'Ingreso hospitalario',
      detail: selectedPatient.diagnosis,
      meta: selectedPatient.bed ? `Cama ${selectedPatient.bed.room}${selectedPatient.bed.letter}` : undefined,
    });

    // Hito de alta (si está dado de alta)
    if (selectedPatient.discharged && selectedPatient.dischargeDate) {
      ev.push({
        id: `discharge-${selectedPatient.id}`,
        kind: 'discharge',
        timestamp: selectedPatient.dischargeDate,
        title: 'Alta médica',
        detail: 'Paciente dado de alta',
      });
    }

    // Cuidados
    for (const r of careRecords) {
      const typeLabel = CARE_RECORD_TYPE_LABELS[r.type] ?? r.type;
      ev.push({
        id: `care-${r.id}`,
        kind: 'care',
        timestamp: r.recordedAt,
        title: typeLabel,
        detail: `${r.value}${r.unit ? ` ${r.unit}` : ''}${r.notes ? ` — ${r.notes}` : ''}`,
        author: r.recordedBy,
      });
    }

    // Medicación: cada schedule administrado o pendiente
    for (const m of medications) {
      for (const s of m.schedules ?? []) {
        const isAdmin = !!s.administeredAt;
        const when = isAdmin ? s.administeredAt! : s.scheduledAt;
        ev.push({
          id: `med-${s.id}`,
          kind: isAdmin ? 'med-given' : 'med-pending',
          timestamp: when,
          title: m.drugName,
          detail: `${m.dose} · ${m.route} · cada ${m.frequencyHrs}h`,
          author: isAdmin ? (s.administeredBy ?? undefined) : undefined,
          meta: isAdmin ? 'Administrada' : 'Programada (sin administrar)',
        });
      }
    }

    // Pruebas diagnósticas
    for (const t of diagnosticTests) {
      const statusLabel = t.status === 'COMPLETED' ? 'Realizada' : t.status === 'CANCELLED' ? 'Cancelada' : 'Pendiente';
      ev.push({
        id: `test-${t.id}`,
        kind: 'test',
        timestamp: t.scheduledAt,
        title: `${t.type === 'LAB' ? 'Laboratorio' : 'Imagen'}: ${t.name}`,
        detail: t.result ? `Resultado: ${t.result}` : statusLabel,
        author: t.requestedBy,
        meta: statusLabel,
      });
    }

    // Incidencias
    for (const i of incidents) {
      const sev = i.severity ? ` · ${i.severity}` : '';
      const status = i.status === 'RESUELTA' ? ' · ✅ Resuelta' : ' · 🔴 Abierta';
      ev.push({
        id: `incident-${i.id}`,
        kind: 'incident',
        timestamp: i.reportedAt,
        title: `${i.type.replace(/_/g, ' ')}${sev}${status}`,
        detail: i.description + (i.resolution ? `\n\n→ Resolución: ${i.resolution}` : ''),
        author: i.reportedBy,
      });
    }

    return ev.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [selectedPatient, careRecords, medications, diagnosticTests, incidents]);

  // Eventos filtrados por visita y tipo
  const visibleEvents = useMemo(() => {
    if (!selectedPatient) return [];
    const admissionTime = new Date(selectedPatient.admissionDate).getTime();
    return allEvents.filter((e) => {
      // Filtro por visita (admission/discharge siempre se muestran)
      if (e.kind !== 'admission' && e.kind !== 'discharge') {
        const t = new Date(e.timestamp).getTime();
        if (visitMode === 'current' && t < admissionTime) return false;
        if (visitMode === 'previous' && t >= admissionTime) return false;
      }
      // Filtro por tipo
      if (e.kind !== 'admission' && e.kind !== 'discharge') {
        if (!activeFilters.has(e.kind as Exclude<EventKind, 'admission' | 'discharge'>)) return false;
      }
      return true;
    });
  }, [allEvents, selectedPatient, visitMode, activeFilters]);

  const previousEventsCount = useMemo(() => {
    if (!selectedPatient) return 0;
    const admissionTime = new Date(selectedPatient.admissionDate).getTime();
    return allEvents.filter(
      (e) => e.kind !== 'admission' && e.kind !== 'discharge' &&
             new Date(e.timestamp).getTime() < admissionTime,
    ).length;
  }, [allEvents, selectedPatient]);

  // ─── Resumen clínico ─────────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (!selectedPatient) return null;
    const admissionTime = new Date(selectedPatient.admissionDate).getTime();
    const isCurrent = (ts: string) => new Date(ts).getTime() >= admissionTime;
    return {
      constants: careRecords.filter((r) => r.type.startsWith('constante') && isCurrent(r.recordedAt)).length,
      caresGiven: careRecords.filter((r) => !r.type.startsWith('constante') && isCurrent(r.recordedAt)).length,
      activeMeds: medications.filter((m) => m.active).length,
      pendingTests: diagnosticTests.filter((t) => t.status === 'REQUESTED' || t.status === 'APPROVED').length,
      openIncidents: incidents.filter((i) => (i.status ?? 'ABIERTA') === 'ABIERTA').length,
    };
  }, [selectedPatient, careRecords, medications, diagnosticTests, incidents]);

  const isLoadingAny = loadingCares || loadingMeds || loadingTests || loadingIncidents;

  const toggleFilter = (k: Exclude<EventKind, 'admission' | 'discharge'>) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Historial Clínico</h1>
        <p className="text-slate-500 text-sm font-medium mt-1">
          Cronología completa de la actividad clínica del paciente {isDoctor ? '— MED-RF1' : ''}
        </p>
      </div>

      {/* Selector paciente */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={selectedPatientId}
            onChange={(e) => { setSelectedPatientId(e.target.value); setVisitMode('current'); }}
            disabled={loadingPatients}
            className="appearance-none bg-white border border-slate-200 rounded-2xl px-4 py-2.5 pr-9 text-sm text-slate-800 font-medium shadow-sm focus:outline-none focus:ring-2 ring-blue-500/20 disabled:opacity-60 min-w-72"
          >
            <option value="">— Seleccionar paciente —</option>
            {patients.map((p) => {
              const sc = statusConfig[p.status] ?? statusConfig.ESTABLE;
              return <option key={p.id} value={p.id}>{fullName(p)} — {sc.label}</option>;
            })}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {patientsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-medium">
          Error al cargar los pacientes. Verifica que el backend esté activo.
        </div>
      )}

      {!selectedPatientId ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 bg-white border border-slate-200 rounded-2xl">
          <History className="w-12 h-12 opacity-30" />
          <p className="font-medium">Selecciona un paciente para ver su historial clínico</p>
        </div>
      ) : !selectedPatient ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      ) : (
        <>
          {/* ─── Cabecera paciente estilo hospital ─────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-900 px-6 py-5 flex items-start gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                {ageFromDob(selectedPatient.dob) >= 65 ? '👴' : '🧑'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-white">{fullName(selectedPatient)}</h2>
                  {(() => {
                    const sc = statusConfig[selectedPatient.status] ?? statusConfig.ESTABLE;
                    return (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                        {sc.label.toUpperCase()}
                      </span>
                    );
                  })()}
                  {selectedPatient.discharged && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-700 text-slate-200">
                      DADO DE ALTA
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-slate-400">
                  <span>{ageFromDob(selectedPatient.dob)} años</span>
                  {selectedPatient.dni && <span>· DNI: {selectedPatient.dni}</span>}
                  {selectedPatient.bed && <span>· Hab. {selectedPatient.bed.room}{selectedPatient.bed.letter}</span>}
                </div>
              </div>
              <FileText className="w-6 h-6 text-slate-500 shrink-0 mt-1" />
            </div>

            {/* Datos clínicos clave */}
            <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" /> Diagnóstico
                </p>
                <p className="font-bold text-slate-800 text-xs leading-snug">{selectedPatient.diagnosis}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Ingreso
                </p>
                <p className="font-bold text-slate-800 text-xs">
                  {new Date(selectedPatient.admissionDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Hace {daysBetween(new Date(selectedPatient.admissionDate), new Date())} días
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cama</p>
                <p className="font-bold text-slate-800 text-xs">
                  {selectedPatient.bed ? `Hab. ${selectedPatient.bed.room}${selectedPatient.bed.letter}` : 'Sin asignar'}
                </p>
              </div>
              <div className={`rounded-xl p-3 border ${getAllergiesCount(selectedPatient.allergies) > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${getAllergiesCount(selectedPatient.allergies) > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  Alergias
                </p>
                <p className={`font-bold text-xs leading-snug ${getAllergiesCount(selectedPatient.allergies) > 0 ? 'text-red-900' : 'text-emerald-900'}`}>
                  {getAllergiesCount(selectedPatient.allergies) > 0 ? parseAllergies(selectedPatient.allergies).join(', ') : 'Ninguna conocida'}
                </p>
              </div>
            </div>

            {/* Resumen actividad */}
            {summary && (
              <div className="px-6 pb-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
                <SummaryCard color="blue" label="Constantes" value={summary.constants} icon={Activity} />
                <SummaryCard color="emerald" label="Cuidados" value={summary.caresGiven} icon={ShieldCheck} />
                <SummaryCard color="orange" label="Medicación activa" value={summary.activeMeds} icon={Pill} />
                <SummaryCard color="violet" label="Pruebas pendientes" value={summary.pendingTests} icon={TestTube} />
                <SummaryCard color="red" label="Incidencias abiertas" value={summary.openIncidents} icon={AlertTriangle} />
              </div>
            )}
          </div>

          {/* ─── Selector visita actual / anteriores ─────────────────── */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
              <button
                onClick={() => setVisitMode('current')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${visitMode === 'current' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Calendar className="w-4 h-4" />
                Visita actual
              </button>
              <button
                onClick={() => setVisitMode('previous')}
                disabled={previousEventsCount === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${visitMode === 'previous' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <History className="w-4 h-4" />
                Visitas anteriores
                <span className="text-[10px] bg-slate-200 text-slate-700 font-black px-1.5 py-0.5 rounded-full">{previousEventsCount}</span>
              </button>
              <button
                onClick={() => setVisitMode('all')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${visitMode === 'all' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Todo
              </button>
            </div>

            {/* Filtros por tipo */}
            <div className="flex flex-wrap gap-1.5 ml-auto">
              {(Object.keys(FILTER_LABELS) as Array<keyof typeof FILTER_LABELS>).map((k) => {
                const active = activeFilters.has(k);
                const style = KIND_STYLES[k];
                return (
                  <button
                    key={k}
                    onClick={() => toggleFilter(k)}
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border-2 transition-all ${
                      active
                        ? `${style.dot} text-white border-transparent`
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {FILTER_LABELS[k]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Timeline ─────────────────────────────────────────────── */}
          {isLoadingAny ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : visibleEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 bg-white border border-slate-200 rounded-2xl">
              <History className="w-12 h-12 opacity-30" />
              <p className="font-medium">
                {visitMode === 'previous' ? 'Este paciente no tiene historial de visitas anteriores' : 'Sin eventos en esta visita con los filtros activos'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <p className="text-xs text-slate-500 font-bold">
                  {visibleEvents.length} evento{visibleEvents.length !== 1 ? 's' : ''} ·{' '}
                  {visitMode === 'current' ? 'Visita actual' : visitMode === 'previous' ? 'Visitas anteriores' : 'Historia completa'}
                </p>
                <span className="text-[10px] text-slate-400 font-bold">Cronología descendente</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {visibleEvents.map((e) => {
                  const style = KIND_STYLES[e.kind];
                  const Icon = style.icon;
                  const date = new Date(e.timestamp);
                  const isHito = e.kind === 'admission' || e.kind === 'discharge';

                  // Si la incidencia tiene severity, extráela del detail/title para badge
                  const sevMatch = e.kind === 'incident' ? e.title.match(/(LEVE|MODERADA|GRAVE|CRITICA)/) : null;
                  const sev = sevMatch ? SEVERITY_BADGE[sevMatch[1]] : null;

                  return (
                    <li
                      key={e.id}
                      className={`px-5 py-4 flex gap-4 hover:bg-slate-50 transition-colors ${isHito ? 'bg-slate-50/40' : ''}`}
                    >
                      <div className="flex flex-col items-center pt-1 shrink-0">
                        <div className={`w-9 h-9 ${style.dot} rounded-full flex items-center justify-center ring-4 ${style.ringColor}`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="w-px flex-1 bg-slate-100 mt-1" />
                      </div>
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white ${style.dot}`}>
                              {style.label.toUpperCase()}
                            </span>
                            {sev && (
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white ${sev.bg}`}>
                                {sev.label}
                              </span>
                            )}
                            {e.meta && (
                              <span className="text-[10px] text-slate-500 font-bold">{e.meta}</span>
                            )}
                          </div>
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0 font-bold">
                            <Clock className="w-3 h-3" />
                            {date.toLocaleString('es-ES', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`${isHito ? 'text-base font-black' : 'text-sm font-bold'} text-slate-900`}>
                          {e.title}
                        </p>
                        {e.detail && (
                          <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{e.detail}</p>
                        )}
                        {e.author && (
                          <p className="text-[10px] text-slate-400 mt-1 font-bold flex items-center gap-1">
                            <User className="w-3 h-3" />{e.author}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  color,
  label,
  value,
  icon: Icon,
}: {
  color: 'blue' | 'emerald' | 'orange' | 'violet' | 'red';
  label: string;
  value: number;
  icon: typeof Activity;
}) {
  const styles: Record<typeof color, string> = {
    blue:    'bg-blue-50 border-blue-200 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    orange:  'bg-orange-50 border-orange-200 text-orange-700',
    violet:  'bg-violet-50 border-violet-200 text-violet-700',
    red:     'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={`rounded-xl p-3 border-2 ${styles[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <Icon className="w-3.5 h-3.5" />
        <p className="text-xl font-black">{value}</p>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wide leading-tight">{label}</p>
    </div>
  );
}
