import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Loader2, Plus, X, CheckCircle2, AlertCircle,
  FileWarning, Calendar, User, ChevronDown, Pill, ClipboardList
} from 'lucide-react';
import { api } from '@/lib/api';
import { parseAllergies, getAllergiesCount, fullName } from '@/lib/patientUtils';
import type { Patient, Incident } from '@/lib/types';

const statusConfig: Record<string, { label: string; dot: string }> = {
  ESTABLE: { label: 'Estable', dot: 'bg-emerald-500' },
  OBSERVACION: { label: 'Observación', dot: 'bg-amber-500' },
  MODERADO: { label: 'Moderado', dot: 'bg-orange-500' },
  CRITICO: { label: 'Crítico', dot: 'bg-red-500' },
};

const INCIDENT_TYPES = [
  { value: 'MED_REFUSAL',     label: 'Rechazo de medicación', icon: <Pill className="w-3 h-3" /> },
  { value: 'CARE_INCIDENT',   label: 'Incidente de cuidados', icon: <ClipboardList className="w-3 h-3" /> },
  { value: 'VOMIT_AFTER_MED', label: 'Vómito tras administración', icon: <AlertCircle className="w-3 h-3" /> },
  { value: 'SIDE_EFFECT',     label: 'Efecto adverso observado', icon: <AlertTriangle className="w-3 h-3" /> },
  { value: 'FALL',            label: 'Caída del paciente', icon: <AlertTriangle className="w-3 h-3" /> },
  { value: 'OTHER',           label: 'Otro incidente', icon: <FileWarning className="w-3 h-3" /> },
];

const INCIDENT_COLORS: Record<string, string> = {
  MED_REFUSAL:     'bg-red-100 text-red-700 border-red-200',
  CARE_INCIDENT:   'bg-orange-100 text-orange-700 border-orange-200',
  VOMIT_AFTER_MED: 'bg-amber-100 text-amber-700 border-amber-200',
  SIDE_EFFECT:     'bg-purple-100 text-purple-700 border-purple-200',
  FALL:            'bg-rose-100 text-rose-700 border-rose-200',
  OTHER:           'bg-slate-100 text-slate-700 border-slate-200',
};

const incidentSchema = z.object({
  patientId: z.string().min(1, 'Selecciona un paciente'),
  type: z.enum(['MED_REFUSAL', 'CARE_INCIDENT', 'VOMIT_AFTER_MED', 'SIDE_EFFECT', 'FALL', 'OTHER']),
  description: z.string().min(1, 'La descripción es obligatoria'),
});

type IncidentForm = z.infer<typeof incidentSchema>;

export default function IncidentsPage() {
  const qc = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [filterType, setFilterType] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<IncidentForm>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      patientId: '',
      type: 'MED_REFUSAL',
      description: '',
    },
  });

  const { data: patients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get<Patient[]>('/patients'),
  });

  const { data: allIncidents = [], isLoading } = useQuery({
    queryKey: ['incidents', selectedPatientId],
    queryFn: () => {
      if (selectedPatientId) return api.get<Incident[]>(`/incidents/${selectedPatientId}`);
      return api.get<Incident[]>('/incidents');
    },
    enabled: true,
  });

  const incidentMutation = useMutation({
    mutationFn: (body: IncidentForm) =>
      api.post<Incident>('/incidents', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents', selectedPatientId] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      reset();
      setShowForm(false);
      setSuccessMsg('Incidencia registrada correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const onSubmit = (data: IncidentForm) => {
    incidentMutation.mutate(data);
  };

  const filteredIncidents = allIncidents.filter(inc => {
    if (filterType && inc.type !== filterType) return false;
    return true;
  });

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Incidencias</h1>
        <p className="text-slate-500 text-sm font-medium mt-1">Registro y seguimiento de rechazos de medicación e incidentes</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-red-500 p-5 text-white shadow-lg shadow-red-100">
          <p className="text-red-100 text-xs font-bold uppercase tracking-wide mb-1">Total incidencias</p>
          <p className="text-3xl font-black">{allIncidents.length}</p>
          <AlertTriangle className="w-5 h-5 text-red-200 mt-2" />
        </div>
        <div className="rounded-2xl bg-orange-500 p-5 text-white shadow-lg shadow-orange-100">
          <p className="text-orange-100 text-xs font-bold uppercase tracking-wide mb-1">Rechazos medicación</p>
          <p className="text-3xl font-black">{allIncidents.filter(i => i.type === 'MED_REFUSAL').length}</p>
          <Pill className="w-5 h-5 text-orange-200 mt-2" />
        </div>
        <div className="rounded-2xl bg-amber-500 p-5 text-white shadow-lg shadow-amber-100">
          <p className="text-amber-100 text-xs font-bold uppercase tracking-wide mb-1">Incidentes cuidados</p>
          <p className="text-3xl font-black">{allIncidents.filter(i => i.type !== 'MED_REFUSAL').length}</p>
          <ClipboardList className="w-5 h-5 text-amber-200 mt-2" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={selectedPatientId}
            onChange={(e) => {
              setSelectedPatientId(e.target.value);
              setValue('patientId', e.target.value);
            }}
            disabled={loadingPatients}
            className="appearance-none bg-white border border-slate-200 rounded-2xl px-4 py-2.5 pr-9 text-sm text-slate-800 font-medium shadow-sm focus:outline-none focus:ring-2 ring-blue-500/20 disabled:opacity-60 min-w-64"
          >
            <option value="">— Todos los pacientes —</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{fullName(p)}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-2xl px-4 py-2.5 pr-9 text-sm text-slate-800 font-medium shadow-sm focus:outline-none focus:ring-2 ring-blue-500/20 min-w-56"
          >
            <option value="">— Todos los tipos —</option>
            {INCIDENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <button
          onClick={() => setShowForm((v) => !v)}
          className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl transition-all shadow-sm ${showForm ? 'bg-slate-200 text-slate-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Registrar incidencia'}
        </button>

        {successMsg && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 font-bold">
            <CheckCircle2 className="w-4 h-4" />{successMsg}
          </div>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Registrar nueva incidencia
          </h3>

          {!selectedPatientId && (
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Paciente *</label>
              <select
                {...register('patientId')}
                onChange={(e) => {
                  setSelectedPatientId(e.target.value);
                  setValue('patientId', e.target.value);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-red-400/30"
              >
                <option value="">— Seleccionar paciente —</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{fullName(p)}</option>)}
              </select>
              {errors.patientId && (
                <p className="text-xs text-red-500 mt-1">{errors.patientId.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Tipo de incidencia *</label>
              <select {...register('type')} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-red-400/30">
                {INCIDENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Descripción *</label>
              <input type="text" placeholder="Describe la incidencia..." {...register('description')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 ring-red-400/30" />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
            </div>
          </div>

          {incidentMutation.isError && (
            <div className="flex items-center gap-2 text-sm text-red-600 font-bold mb-3">
              <AlertCircle className="w-4 h-4" />{incidentMutation.error.message}</div>
          )}

          <button
            type="submit"
            disabled={incidentMutation.isPending}
            className="flex items-center gap-2 bg-red-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-red-200"
          >
            {incidentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Guardar incidencia
          </button>
        </form>
      )}

      {selectedPatient && (
        <div className="bg-slate-900 rounded-2xl px-5 py-3 flex items-center gap-4">
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-lg shrink-0">
            {new Date().getFullYear() - new Date(selectedPatient.dob).getFullYear() >= 65 ? '👴' : '🧑'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-black text-white text-sm">{fullName(selectedPatient)}</p>
              {(() => { const sc = statusConfig[selectedPatient.status] ?? statusConfig.ESTABLE; return <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} title={sc.label} />; })()}
            </div>
            <p className="text-slate-400 text-xs">{selectedPatient.diagnosis}</p>
          </div>
          {getAllergiesCount(selectedPatient.allergies) > 0 && (
            <span className="text-xs bg-red-500 text-white font-black px-2 py-1 rounded-lg shrink-0">
              🚫 {parseAllergies(selectedPatient.allergies).join(', ')}
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
      ) : filteredIncidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 bg-white border border-slate-200 rounded-2xl">
          <FileWarning className="w-12 h-12 opacity-30" />
          <p className="font-medium">Sin incidencias registradas{filterType ? ' de este tipo' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((inc) => {
            const typeInfo = INCIDENT_TYPES.find(t => t.value === inc.type);
            const colorClass = INCIDENT_COLORS[inc.type] ?? 'bg-slate-100 text-slate-700 border-slate-200';
            const date = new Date(inc.reportedAt);

            return (
              <div key={inc.id} className="bg-white border border-slate-200 border-l-4 border-l-red-400 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${colorClass}`}>
                        {typeInfo?.label ?? inc.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}
                        {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 font-medium">{inc.description}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold flex items-center gap-1">
                      <User className="w-3 h-3" />Reportado por: {inc.reportedBy}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
