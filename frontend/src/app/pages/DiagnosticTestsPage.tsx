import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TestTube, FlaskConical, ImageIcon, Loader2, ChevronDown,
  Plus, X, Calendar, CheckCircle2, Clock, ThumbsUp, ThumbsDown, Ban,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { parseAllergies, getAllergiesCount } from '@/lib/patientUtils';
import type { Patient, DiagnosticTest } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-amber-100 text-amber-700 border-amber-300',
  APPROVED: 'bg-blue-100 text-blue-700 border-blue-300',
  REJECTED: 'bg-red-100 text-red-700 border-red-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-300',
};

const scheduleSchema = z.object({
  patientId: z.string().min(1, 'Selecciona un paciente'),
  type: z.enum(['LAB', 'IMAGING']),
  name: z.string().min(1, 'El nombre es obligatorio'),
  scheduledAt: z.string().min(1, 'La fecha es obligatoria'),
});

type ScheduleForm = z.infer<typeof scheduleSchema>;

export default function DiagnosticTestsPage() {
  const { user } = useAuthStore();
  const isDoctor = user?.role === 'DOCTOR';
  const isNurse = user?.role === 'NURSE';
  const canRequest = isDoctor || isNurse;
  const queryClient = useQueryClient();

  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      patientId: '',
      type: 'LAB',
      name: '',
      scheduledAt: '',
    },
  });

  const { data: patients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get<Patient[]>('/patients'),
  });

  const { data: allTests = [], isLoading: loadingTests } = useQuery({
    queryKey: ['tests', selectedPatientId],
    queryFn: () => api.get<DiagnosticTest[]>(`/tests/${selectedPatientId}`),
    enabled: selectedPatientId !== '',
  });

  const labTests     = allTests.filter((t) => t.type === 'LAB');
  const imagingTests = allTests.filter((t) => t.type === 'IMAGING');
  const pendingCount = allTests.filter((t) => !t.result).length;

  const scheduleMutation = useMutation({
    mutationFn: (body: ScheduleForm) =>
      api.post<DiagnosticTest>('/tests', {
        ...body,
        scheduledAt: new Date(body.scheduledAt).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests', selectedPatientId] });
      reset();
      setShowForm(false);
      setSuccessMsg('Prueba programada correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const onSubmit = (data: ScheduleForm) => {
    scheduleMutation.mutate(data);
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pruebas Diagnósticas</h1>
        <p className="text-slate-500 text-sm font-medium mt-1">Visualización y programación de pruebas por paciente</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-blue-500 p-5 text-white shadow-lg shadow-blue-100">
          <p className="text-blue-100 text-xs font-bold uppercase tracking-wide mb-1">Total pruebas</p>
          <p className="text-3xl font-black">{allTests.length}</p>
          <TestTube className="w-5 h-5 text-blue-200 mt-2" />
        </div>
        <div className="rounded-2xl bg-orange-500 p-5 text-white shadow-lg shadow-orange-100">
          <p className="text-orange-100 text-xs font-bold uppercase tracking-wide mb-1">Laboratorio</p>
          <p className="text-3xl font-black">{labTests.length}</p>
          <FlaskConical className="w-5 h-5 text-orange-200 mt-2" />
        </div>
        <div className="rounded-2xl bg-violet-500 p-5 text-white shadow-lg shadow-violet-100">
          <p className="text-violet-100 text-xs font-bold uppercase tracking-wide mb-1">Imagen</p>
          <p className="text-3xl font-black">{imagingTests.length}</p>
          <ImageIcon className="w-5 h-5 text-violet-200 mt-2" />
        </div>
        <div className={`rounded-2xl p-5 text-white shadow-lg ${pendingCount > 0 ? 'bg-red-500 shadow-red-100' : 'bg-emerald-500 shadow-emerald-100'}`}>
          <p className="text-white/70 text-xs font-bold uppercase tracking-wide mb-1">Pendientes</p>
          <p className="text-3xl font-black">{pendingCount}</p>
          <Calendar className="w-5 h-5 text-white/60 mt-2" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={selectedPatientId}
            onChange={(e) => {
              setSelectedPatientId(e.target.value);
              setValue('patientId', e.target.value);
              setShowForm(false);
            }}
            disabled={loadingPatients}
            className="appearance-none bg-white border border-slate-200 rounded-2xl px-4 py-2.5 pr-9 text-sm text-slate-800 font-medium shadow-sm focus:outline-none focus:ring-2 ring-blue-500/20 disabled:opacity-60 min-w-64"
          >
            <option value="">— Seleccionar paciente —</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.name} {p.surnames}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {selectedPatientId && canRequest && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl transition-all shadow-sm ${showForm ? 'bg-slate-200 text-slate-700' : 'bg-slate-900 text-white hover:bg-black'}`}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancelar' : isDoctor ? 'Asignar prueba' : 'Solicitar prueba'}
          </button>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 font-bold">
            <CheckCircle2 className="w-4 h-4" />{successMsg}
          </div>
        )}
      </div>

      {/* Schedule form */}
      {showForm && selectedPatientId && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Programar nueva prueba diagnóstica
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Tipo</label>
              <select {...register('type')} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20">
                <option value="LAB">Laboratorio</option>
                <option value="IMAGING">Diagnóstico por imagen</option>
              </select>
              {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre *</label>
              <input type="text" placeholder="ej: Hemograma, Rx Tórax..." {...register('name')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 ring-blue-500/20" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Fecha programada *</label>
              <input type="datetime-local" {...register('scheduledAt')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20" />
              {errors.scheduledAt && <p className="text-xs text-red-500 mt-1">{errors.scheduledAt.message}</p>}
            </div>
          </div>
          <button type="submit" disabled={scheduleMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200">
            {scheduleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isDoctor ? 'Asignar prueba' : 'Enviar solicitud'}
          </button>
        </form>
      )}

      {/* Patient info strip */}
      {selectedPatient && (
        <div className="bg-slate-900 rounded-2xl px-5 py-3 flex items-center gap-4">
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-lg shrink-0">
            {new Date().getFullYear() - new Date(selectedPatient.dob).getFullYear() >= 65 ? '👴' : '🧑'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-sm">{selectedPatient.name}</p>
            <p className="text-slate-400 text-xs">{selectedPatient.diagnosis}</p>
          </div>
          {getAllergiesCount(selectedPatient.allergies) > 0 && (
            <span className="text-xs bg-red-500 text-white font-black px-2 py-1 rounded-lg shrink-0">
              🚫 {parseAllergies(selectedPatient.allergies).join(', ')}
            </span>
          )}
        </div>
      )}

      {!selectedPatientId ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 bg-white border border-slate-200 rounded-2xl">
          <TestTube className="w-12 h-12 opacity-30" />
          <p className="font-medium">Selecciona un paciente para ver sus pruebas diagnósticas</p>
        </div>
      ) : loadingTests ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : allTests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 bg-white border border-slate-200 rounded-2xl">
          <TestTube className="w-12 h-12 opacity-30" />
          <p className="font-medium">Sin pruebas registradas para este paciente</p>
          {isDoctor && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-bold mt-1">
              <Plus className="w-4 h-4" />Programar primera prueba
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TestSection title="Pruebas de Laboratorio" icon={FlaskConical} tests={labTests}
            emptyLabel="Sin pruebas de laboratorio" headerBg="bg-orange-500" accentBorder="border-t-orange-500" isDoctor={isDoctor} />
          <TestSection title="Diagnóstico por Imagen" icon={ImageIcon} tests={imagingTests}
            emptyLabel="Sin pruebas de imagen" headerBg="bg-violet-500" accentBorder="border-t-violet-500" isDoctor={isDoctor} />
        </div>
      )}
    </div>
  );
}

function TestSection({
  title, icon: Icon, tests, emptyLabel, headerBg, accentBorder, isDoctor,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tests: DiagnosticTest[];
  emptyLabel: string;
  headerBg: string;
  accentBorder: string;
  isDoctor: boolean;
}) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (testId: string) =>
      api.put(`/tests/${testId}/status`, { status: 'APPROVED' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tests'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (testId: string) =>
      api.put(`/tests/${testId}/status`, { status: 'REJECTED' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tests'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (testId: string) => api.delete(`/tests/${testId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tests'] }),
  });

  return (
    <div className={`bg-white border border-slate-200 border-t-4 ${accentBorder} rounded-2xl overflow-hidden shadow-sm`}>
      <div className={`flex items-center gap-3 px-5 py-4 border-b border-slate-100`}>
        <div className={`w-8 h-8 rounded-xl ${headerBg} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-black text-slate-900">{title}</h3>
        <span className="ml-auto text-xs bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">{tests.length}</span>
      </div>

      {tests.length === 0 ? (
        <p className="text-sm text-slate-400 font-medium text-center py-10">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {tests.map((t) => {
            const status = t.status || 'REQUESTED';
            return (
              <li key={t.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{t.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded shrink-0 border ${STATUS_COLORS[status]}`}>
                      {STATUS_LABELS[status]}
                    </span>
                    {status === 'REQUESTED' && isDoctor && (
                      <>
                        <button
                          onClick={() => approveMutation.mutate(t.id)}
                          disabled={approveMutation.isPending}
                          className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded hover:bg-emerald-600 transition-colors"
                        >
                          <ThumbsUp className="w-3 h-3" /> Aceptar
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(t.id)}
                          disabled={rejectMutation.isPending}
                          className="flex items-center gap-1 text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600 transition-colors"
                        >
                          <ThumbsDown className="w-3 h-3" /> Rechazar
                        </button>
                      </>
                    )}
                    {isDoctor && status !== 'COMPLETED' && (
                      <button
                        onClick={() => cancelMutation.mutate(t.id)}
                        disabled={cancelMutation.isPending}
                        title="Eliminar prueba"
                        className="flex items-center gap-1 text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <Ban className="w-3 h-3" /> Cancelar
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 font-medium mb-1">
                  <Clock className="w-3 h-3" />
                  {new Date(t.scheduledAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                {t.result && (
                  <p className="text-xs bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-slate-700 mt-2">
                    <span className="font-bold text-emerald-700">Resultado: </span>{t.result}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">Solicitado por: {t.requestedBy}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
