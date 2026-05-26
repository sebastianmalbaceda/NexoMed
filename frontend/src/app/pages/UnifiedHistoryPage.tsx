import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { History, Loader2, ChevronDown, Clock, Pill, Activity, FileText, User, TestTube, FlaskConical, ImageIcon, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { CARE_RECORD_TYPE_LABELS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { parseAllergies, getAllergiesCount, fullName } from '@/lib/patientUtils';
import type { Patient, CareRecord, Medication, MedSchedule, DiagnosticTest } from '@/lib/types';

const statusConfig: Record<string, { label: string; dot: string }> = {
  ESTABLE: { label: 'Estable', dot: 'bg-emerald-500' },
  OBSERVACION: { label: 'Observación', dot: 'bg-amber-500' },
  MODERADO: { label: 'Moderado', dot: 'bg-orange-500' },
  CRITICO: { label: 'Crítico', dot: 'bg-red-500' },
};

const TYPE_BADGE: Record<string, string> = {
  constante: 'bg-blue-100 text-blue-700 border-blue-200',
  cura:      'bg-orange-100 text-orange-700 border-orange-200',
  higiene:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  balance:   'bg-sky-100 text-sky-700 border-sky-200',
  ingesta:   'bg-amber-100 text-amber-700 border-amber-200',
};
const TYPE_DOT: Record<string, string> = {
  constante: 'bg-blue-500',
  cura:      'bg-orange-500',
  higiene:   'bg-emerald-500',
  balance:   'bg-sky-500',
  ingesta:   'bg-amber-500',
};
const TYPE_PILL_ACTIVE: Record<string, string> = {
  constante: 'bg-blue-500 text-white border-blue-500',
  cura:      'bg-orange-500 text-white border-orange-500',
  higiene:   'bg-emerald-500 text-white border-emerald-500',
  balance:   'bg-sky-500 text-white border-sky-500',
  ingesta:   'bg-amber-500 text-white border-amber-500',
};

export default function UnifiedHistoryPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'care' | 'meds' | 'tests'>('care');

  useEffect(() => {
    const pid = searchParams.get('patientId');
    if (pid) setSelectedPatientId(pid);
  }, [searchParams]);

  const { data: patients = [], isLoading: loadingPatients, isError: patientsError } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get<Patient[]>('/patients'),
  });

  const { data: records = [], isLoading: loadingRecords, isError: recordsError } = useQuery({
    queryKey: ['care-records', selectedPatientId],
    queryFn: () => api.get<CareRecord[]>(`/cares/${selectedPatientId}`),
    enabled: selectedPatientId !== '',
  });

  const { data: medications = [], isLoading: loadingMeds, isError: medsError } = useQuery({
    queryKey: ['medications-history', selectedPatientId],
    queryFn: () => api.get<Medication[]>(`/medications/${selectedPatientId}`),
    enabled: selectedPatientId !== '' && (user?.role === 'DOCTOR' || user?.role === 'NURSE'),
  });

  const { data: diagnosticTests = [], isLoading: loadingTests, isError: testsError } = useQuery({
    queryKey: ['tests-history', selectedPatientId],
    queryFn: () => api.get<DiagnosticTest[]>(`/tests/${selectedPatientId}`),
    enabled: selectedPatientId !== '',
  });

  const filtered = typeFilter ? records.filter((r) => r.type === typeFilter) : records;
  const uniqueTypes = Array.from(new Set(records.map((r) => r.type)));
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);
  const isDoctor = user?.role === 'DOCTOR';
  const showMedsTab = isDoctor || user?.role === 'NURSE';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {isDoctor ? 'Historial Clínico Completo' : 'Historial Unificado'}
        </h1>
        <p className="text-slate-500 text-sm font-medium mt-1">
          {isDoctor ? 'Acceso completo al historial clínico — MED-RF1' : 'Registro de cuidados y constantes por paciente'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={selectedPatientId}
            onChange={(e) => { setSelectedPatientId(e.target.value); setTypeFilter(''); setActiveTab('care'); }}
            disabled={loadingPatients}
            className="appearance-none bg-white border border-slate-200 rounded-2xl px-4 py-2.5 pr-9 text-sm text-slate-800 font-medium shadow-sm focus:outline-none focus:ring-2 ring-blue-500/20 disabled:opacity-60 min-w-56"
          >
            <option value="">— Seleccionar paciente —</option>
            {patients.map((p) => {
              const sc = statusConfig[p.status] ?? statusConfig.ESTABLE;
              return <option key={p.id} value={p.id}>{p.name} {p.surnames} — {sc.label}</option>;
            })}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {selectedPatientId && (
          <div className="flex gap-2 ml-auto">
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl font-bold">
              📋 {records.length} registros
            </span>
            {medications.length > 0 && (
              <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-xl font-bold">
                💊 {medications.length} medicamentos
              </span>
            )}
            {diagnosticTests.length > 0 && (
              <span className="text-xs bg-violet-50 text-violet-700 border border-violet-200 px-3 py-1.5 rounded-xl font-bold">
                🧪 {diagnosticTests.length} pruebas
              </span>
            )}
          </div>
        )}
      </div>

      {selectedPatient && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-900 px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-2xl shrink-0">
              {new Date().getFullYear() - new Date(selectedPatient.dob).getFullYear() >= 65 ? '👴' : '🧑'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-black text-white">{fullName(selectedPatient)}</p>
                {(() => { const sc = statusConfig[selectedPatient.status] ?? statusConfig.ESTABLE; return <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${sc.dot}`} title={sc.label} />; })()}
              </div>
              <p className="text-xs text-slate-400">Historial clínico completo</p>
            </div>
            <FileText className="w-5 h-5 text-slate-400 shrink-0" />
          </div>
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            {[
              { label: 'Diagnóstico', value: selectedPatient.diagnosis, color: '' },
              { label: 'Ingreso', value: new Date(selectedPatient.admissionDate).toLocaleDateString('es-ES'), color: '' },
              { label: 'Cama', value: selectedPatient.bed ? `Hab. ${selectedPatient.bed.room}${selectedPatient.bed.letter}` : 'Sin asignar', color: '' },
              {
                label: 'Alergias',
                value: getAllergiesCount(selectedPatient.allergies) > 0 ? parseAllergies(selectedPatient.allergies).join(', ') : 'Ninguna conocida',
                color: getAllergiesCount(selectedPatient.allergies) > 0 ? 'text-red-600 font-black' : 'text-emerald-600',
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className={`font-bold text-slate-800 text-xs leading-snug ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {patientsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-medium">
          Error al cargar los pacientes. Verifica que el backend esté activo.
        </div>
      )}

      {!selectedPatientId ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 bg-white border border-slate-200 rounded-2xl">
          <History className="w-12 h-12 opacity-30" />
          <p className="font-medium">Selecciona un paciente para ver su historial</p>
        </div>
      ) : (
        <>
          {showMedsTab && (
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
              <button
                onClick={() => setActiveTab('care')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'care' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Activity className="w-4 h-4" />Cuidados
              </button>
              <button
                onClick={() => setActiveTab('meds')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'meds' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Pill className="w-4 h-4" />Medicación
              </button>
              <button
                onClick={() => setActiveTab('tests')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'tests' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <TestTube className="w-4 h-4" />Pruebas
              </button>
            </div>
          )}

          {activeTab === 'care' && (
            <>
              {uniqueTypes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTypeFilter('')}
                    className={`text-xs px-3 py-1.5 rounded-full border font-bold transition-all ${typeFilter === '' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    Todos ({records.length})
                  </button>
                  {uniqueTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-bold transition-all ${
                        typeFilter === t
                          ? (TYPE_PILL_ACTIVE[t] ?? 'bg-slate-900 text-white border-slate-900')
                          : `${TYPE_BADGE[t] ?? 'bg-white border-slate-200 text-slate-500'} hover:opacity-80`
                      }`}
                    >
                      {CARE_RECORD_TYPE_LABELS[t] ?? t} ({records.filter((r) => r.type === t).length})
                    </button>
                  ))}
                </div>
              )}

              {recordsError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-medium">
                  Error al cargar los registros de cuidados.
                </div>
              )}
              {loadingRecords ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 bg-white border border-slate-200 rounded-2xl">
                  <History className="w-12 h-12 opacity-30" />
                  <p className="font-medium">Sin registros{typeFilter ? ' de este tipo' : ''}</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-bold">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</p>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {filtered.map((record) => (
                      <li key={record.id} className="px-5 py-4 flex gap-4 hover:bg-slate-50 transition-colors">
                        <div className="flex flex-col items-center pt-1">
                          <div className={`w-3 h-3 rounded-full shrink-0 ${TYPE_DOT[record.type] ?? 'bg-slate-400'}`} />
                          <div className="w-px flex-1 bg-slate-100 mt-1" />
                        </div>
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${TYPE_BADGE[record.type] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {CARE_RECORD_TYPE_LABELS[record.type] ?? record.type}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0 font-bold">
                              <Clock className="w-3 h-3" />
                              {new Date(record.recordedAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-800 font-bold">
                            {record.value}
                            {record.unit && <span className="text-slate-400 font-normal"> {record.unit}</span>}
                          </p>
                          {record.notes && <p className="text-xs text-slate-400 mt-1 font-medium">{record.notes}</p>}
                          <p className="text-[10px] text-slate-400 mt-1 font-bold flex items-center gap-1">
                            <User className="w-3 h-3" />{record.recordedBy}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {activeTab === 'meds' && (
            <div className="space-y-4">
              {medsError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-medium">
                  Error al cargar la medicación.
                </div>
              )}
              {loadingMeds ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
              ) : medications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 bg-white border border-slate-200 rounded-2xl">
                  <Pill className="w-12 h-12 opacity-30" />
                  <p className="font-medium">Sin medicación registrada</p>
                </div>
              ) : (
                medications.map((m) => {
                  const schedules: MedSchedule[] = m.schedules || [];
                  const administeredCount = schedules.filter((s) => s.administeredAt).length;
                  const totalCount = schedules.length;
                  const completionPct = totalCount > 0 ? Math.round((administeredCount / totalCount) * 100) : 0;

                  return (
                    <div key={m.id} className="bg-white border border-slate-200 border-t-4 border-t-orange-400 rounded-2xl overflow-hidden shadow-sm">
                      <div className="px-5 py-4 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-black text-slate-900">{m.drugName}</p>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded text-white ${m.active ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                              {m.active ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium">{m.dose} · {m.route} · cada {m.frequencyHrs}h</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Inicio: {new Date(m.startTime).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                            {new Date(m.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-slate-700">{administeredCount}/{totalCount}</p>
                          <p className="text-[10px] text-slate-400">dosis administradas</p>
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${completionPct === 100 ? 'bg-emerald-500' : completionPct > 0 ? 'bg-amber-500' : 'bg-slate-300'}`}
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {schedules.length > 0 && (
                        <div className="px-5 pb-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Historial de administración</p>
                          <div className="flex flex-wrap gap-1.5">
                            {schedules.map((s) => (
                              <div
                                key={s.id}
                                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border font-bold ${
                                  s.administeredAt
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-400'
                                }`}
                              >
                                {s.administeredAt ? (
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                ) : (
                                  <XCircle className="w-2.5 h-2.5" />
                                )}
                                {new Date(s.scheduledAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'tests' && (
            <>
              {testsError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-medium">
                  Error al cargar las pruebas diagnósticas.
                </div>
              )}
              {loadingTests ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
              ) : diagnosticTests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 bg-white border border-slate-200 rounded-2xl">
                  <TestTube className="w-12 h-12 opacity-30" />
                  <p className="font-medium">Sin pruebas diagnósticas registradas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(['LAB', 'IMAGING'] as const).map((testType) => {
                    const tests = diagnosticTests.filter((t) => t.type === testType);
                    if (tests.length === 0) return null;

                    return (
                      <div key={testType} className="bg-white border border-slate-200 border-t-4 rounded-2xl overflow-hidden shadow-sm"
                        style={{ borderTopColor: testType === 'LAB' ? '#f97316' : '#8b5cf6' }}>
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${testType === 'LAB' ? 'bg-orange-500' : 'bg-violet-500'}`}>
                            {testType === 'LAB' ? (
                              <FlaskConical className="w-4 h-4 text-white" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <h3 className="font-black text-slate-900">
                            {testType === 'LAB' ? 'Pruebas de Laboratorio' : 'Diagnóstico por Imagen'}
                          </h3>
                          <span className="ml-auto text-xs bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">{tests.length}</span>
                        </div>
                        <ul className="divide-y divide-slate-100">
                          {tests.map((t) => {
                            const statusBadge = t.status === 'COMPLETED' || t.status === 'CANCELLED'
                              ? { bg: 'bg-emerald-500', label: 'REALIZADO' }
                              : { bg: 'bg-amber-500', label: 'PENDIENTE' };

                            return (
                              <li key={t.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded shrink-0 text-white ${statusBadge.bg}`}>
                                    {statusBadge.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-400 font-medium mb-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(t.scheduledAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                                {t.result && (
                                  <div className="text-xs bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-slate-700 mt-2">
                                    <span className="font-bold text-emerald-700 flex items-center gap-1 mb-1">
                                      <FileText className="w-3 h-3" />Resultado:
                                    </span>
                                    <p className="font-medium">{t.result}</p>
                                  </div>
                                )}
                                <p className="text-[10px] text-slate-400 mt-1">Solicitado por: {t.requestedBy}</p>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
