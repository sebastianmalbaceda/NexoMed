import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, AlertCircle, Loader2, Calendar, BedDouble, ArrowLeft, Activity, Pill, FileText, Clock, UserPlus, X, Check, LogOut, HeartPulse, TestTube, Ban, Plus, ThumbsUp, ThumbsDown, FlaskConical, ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { parseAllergies, getAllergiesCount, fullName } from '@/lib/patientUtils';
import { PatientSchedule } from '@/components/hospital/PatientSchedule';
import type { Patient, Medication, CareRecord, VitalSigns, Bed, DiagnosticTest } from '@/lib/types';

// Computed once at module load — avoids impure Date.now() calls during render
const NOW_MS = new Date().getTime();

// Produces a "YYYY-MM-DDTHH:mm" string in LOCAL time, suitable for datetime-local inputs.
function toLocalDatetimeStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ageFromDob(dob: string): number {
  return Math.floor((NOW_MS - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  ESTABLE: { label: 'Estable', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  OBSERVACION: { label: 'En observación', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  MODERADO: { label: 'Moderado', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  CRITICO: { label: 'Crítico', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

const medSchema = z.object({
  drugName: z.string().min(1, 'El fármaco es obligatorio'),
  nregistro: z.string().optional(),
  dose: z.string().min(1, 'La dosis es obligatoria'),
  route: z.enum(['oral', 'IV', 'IM', 'SC', 'TOPICAL', 'SUBCUTANEOUS', 'RECTAL', 'INHALED'], { message: 'Vía no válida' }),
  frequencyHrs: z.coerce.number().int().positive('La frecuencia debe ser mayor que 0'),
  startTime: z.string().min(1, 'La fecha de inicio es obligatoria'),
  indefinite: z.boolean().default(true),
  endDate: z.string().optional(),
});

type MedForm = z.infer<typeof medSchema>;

const admissionSchema = z.object({
  dni: z.string().optional(),
  name: z.string().min(1, 'El nombre es obligatorio'),
  surnames: z.string().min(1, 'Los apellidos son obligatorios'),
  dob: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
  diagnosis: z.string().min(1, 'El diagnóstico es obligatorio'),
  status: z.enum(['ESTABLE', 'OBSERVACION', 'MODERADO', 'CRITICO']),
  bedId: z.string().optional(),
  allergies: z.array(z.string()).optional(),
});

type AdmissionForm = z.infer<typeof admissionSchema>;

export default function PatientsPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: patients = [], isLoading, isError } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get<Patient[]>('/patients'),
  });

  const { data: beds = [] } = useQuery<Bed[]>({
    queryKey: ['beds'],
    queryFn: () => api.get<Bed[]>('/beds'),
  });

  const freeBeds = beds.filter(b => !b.patient);

  const { data: patientMedications = [] } = useQuery({
    queryKey: ['medications', patientId],
    queryFn: () => api.get<Medication[]>(`/medications/${patientId}`),
    enabled: !!patientId,
  });

  const { data: patientCareRecords = [] } = useQuery({
    queryKey: ['careRecords', patientId],
    queryFn: () => api.get<CareRecord[]>(`/patients/${patientId}/care-records`),
    enabled: !!patientId,
  });

  const { data: patientVitals = [] } = useQuery({
    queryKey: ['vitals', patientId],
    queryFn: () => api.get<VitalSigns[]>(`/patients/${patientId}/vitals`),
    enabled: !!patientId,
  });

  const { data: patientTests = [], isLoading: loadingTests } = useQuery({
    queryKey: ['tests', patientId],
    queryFn: () => api.get<DiagnosticTest[]>(`/tests/${patientId}`),
    enabled: !!patientId,
  });

  const selectedPatient = patientId ? patients.find((p) => p.id === patientId) : null;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const isDoctor = user?.role === 'DOCTOR';

  const [showStatusEdit, setShowStatusEdit] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  // Formulario de medicación
  const [showMedForm, setShowMedForm] = useState(false);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const {
    register: registerMed,
    handleSubmit: handleSubmitMed,
    reset: resetMed,
    watch: watchMed,
    setValue: setMedValue,
    formState: { errors: medErrors },
  } = useForm<MedForm>({
    resolver: zodResolver(medSchema),
    defaultValues: {
      drugName: '',
      nregistro: '',
      dose: '',
      route: 'oral',
      frequencyHrs: 8,
      startTime: toLocalDatetimeStr(new Date()),
      indefinite: true,
      endDate: '',
    },
  });
  const isIndefinite = watchMed('indefinite');

  const openEditMed = (med: import('@/lib/types').Medication) => {
    setEditingMedId(med.id);
    setShowMedForm(true);
    resetMed({
      drugName: med.drugName,
      nregistro: med.nregistro ?? '',
      dose: med.dose,
      route: med.route as MedForm['route'],
      frequencyHrs: med.frequencyHrs,
      // Show the stored UTC timestamp as local time in the datetime-local input
      startTime: toLocalDatetimeStr(new Date(med.startTime)),
      indefinite: !med.endDate,
      endDate: med.endDate ? new Date(med.endDate).toLocaleDateString('en-CA') : '',
    });
  };

  const closeMedForm = () => {
    setShowMedForm(false);
    setEditingMedId(null);
    setMedFormError('');
    resetMed({
      drugName: '', nregistro: '', dose: '', route: 'oral',
      frequencyHrs: 8, startTime: toLocalDatetimeStr(new Date()),
      indefinite: true, endDate: '',
    });
  };

  const [medFormError, setMedFormError] = useState('');

  const createMedMutation = useMutation({
    mutationFn: (data: MedForm) =>
      api.post('/medications', {
        drugName: data.drugName,
        nregistro: data.nregistro,
        dose: data.dose,
        route: data.route,
        frequencyHrs: data.frequencyHrs,
        patientId: selectedPatient!.id,
        startTime: new Date(data.startTime).toISOString(),
        endDate: !data.indefinite && data.endDate ? new Date(data.endDate).toISOString() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', selectedPatient!.id] });
      queryClient.invalidateQueries({ queryKey: ['patient-schedule', selectedPatient!.id] });
      setMedFormError('');
      closeMedForm();
    },
    onError: (e: Error) => setMedFormError(e.message),
  });

  const editMedMutation = useMutation({
    mutationFn: (data: MedForm & { id: string }) =>
      api.put(`/medications/${data.id}`, {
        drugName: data.drugName,
        nregistro: data.nregistro,
        dose: data.dose,
        route: data.route,
        frequencyHrs: data.frequencyHrs,
        startTime: new Date(data.startTime).toISOString(),
        endDate: !data.indefinite && data.endDate ? new Date(data.endDate).toISOString() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', selectedPatient!.id] });
      queryClient.invalidateQueries({ queryKey: ['patient-schedule', selectedPatient!.id] });
      setMedFormError('');
      closeMedForm();
    },
    onError: (e: Error) => setMedFormError(e.message),
  });

  const deactivateMedMutation = useMutation({
    mutationFn: (medId: string) => api.put(`/medications/${medId}/deactivate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', selectedPatient!.id] });
      queryClient.invalidateQueries({ queryKey: ['patient-schedule', selectedPatient!.id] });
    },
  });

  const [dischargeError, setDischargeError] = useState('');

  const dischargeMutation = useMutation({
    mutationFn: (id: string) => api.put(`/patients/${id}/discharge`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setDischargeError('');
      navigate('/patients');
    },
    onError: (e: Error) => setDischargeError(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/patients/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setShowStatusEdit(false);
    },
  });

  // Pruebas diagnósticas
  const [showTestForm, setShowTestForm] = useState(false);
  const [testType, setTestType]     = useState<'LAB' | 'IMAGING'>('LAB');
  const [testName, setTestName]     = useState('');
  const [testDate, setTestDate]     = useState('');

  const createTestMutation = useMutation({
    mutationFn: () => api.post<DiagnosticTest>('/tests', {
      patientId: selectedPatient!.id, type: testType, name: testName,
      scheduledAt: new Date(testDate).toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests', selectedPatient!.id] });
      setShowTestForm(false); setTestName(''); setTestDate('');
    },
  });

  const cancelTestMutation = useMutation({
    mutationFn: (testId: string) => api.delete(`/tests/${testId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tests', selectedPatient!.id] }),
  });

  const approveTestMutation = useMutation({
    mutationFn: (testId: string) => api.put(`/tests/${testId}/status`, { status: 'APPROVED' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tests', selectedPatient!.id] }),
  });

  const rejectTestMutation = useMutation({
    mutationFn: (testId: string) => api.put(`/tests/${testId}/status`, { status: 'REJECTED' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tests', selectedPatient!.id] }),
  });

  // Formulario de registro / re-ingreso
  const [showForm, setShowForm] = useState(false);
  const [dniSearch, setDniSearch] = useState('');
  const [dniFound, setDniFound] = useState<Patient | null>(null);
  const [allergyInput, setAllergyInput] = useState('');

  const {
    register: registerAdm,
    handleSubmit: handleSubmitAdm,
    reset: resetAdm,
    setValue: setAdmValue,
    watch: watchAdm,
    formState: { errors: admErrors },
  } = useForm<AdmissionForm>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      dni: '',
      name: '',
      surnames: '',
      dob: '',
      diagnosis: '',
      status: 'ESTABLE',
      bedId: '',
      allergies: [],
    },
  });

  const allergies = watchAdm('allergies') || [];

  const searchDniMutation = useMutation({
    mutationFn: (dni: string) => api.get<Patient>(`/patients/search?dni=${encodeURIComponent(dni)}`),
    onSuccess: (patient) => {
      setDniFound(patient);
      resetAdm({
        dni: patient.dni ?? '',
        name: patient.name,
        surnames: patient.surnames ?? '',
        dob: patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : '',
        diagnosis: '',
        status: (patient.status as AdmissionForm['status']) ?? 'ESTABLE',
        allergies: parseAllergies(patient.allergies),
        bedId: '',
      });
    },
    onError: () => {
      setDniFound(null);
      resetAdm({
        dni: dniSearch,
        name: '',
        surnames: '',
        dob: '',
        diagnosis: '',
        status: 'ESTABLE',
        allergies: [],
        bedId: '',
      });
    },
  });

  const [createError, setCreateError] = useState('');

  const createPatientMutation = useMutation({
    mutationFn: (data: AdmissionForm) => api.post('/patients', {
      ...data,
      dob: new Date(data.dob).toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setShowForm(false);
      setDniSearch('');
      setDniFound(null);
      setCreateError('');
      resetAdm();
    },
    onError: (e: Error) => setCreateError(e.message),
  });

  const handleAddAllergy = () => {
    const trimmed = allergyInput.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAdmValue('allergies', [...allergies, trimmed]);
      setAllergyInput('');
    }
  };

  const handleRemoveAllergy = (allergy: string) => {
    setAdmValue('allergies', allergies.filter(a => a !== allergy));
  };

  const [assignBedPatientId, setAssignBedPatientId] = useState<string | null>(null);
  const [selectedBedId, setSelectedBedId] = useState('');

  const assignBedMutation = useMutation({
    mutationFn: ({ bedId, patientId }: { bedId: string; patientId: string }) =>
      api.put(`/beds/${bedId}/assign`, { patientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      setAssignBedPatientId(null);
      setSelectedBedId('');
    },
  });

  const filtered = patients.filter((p) =>
    fullName(p).toLowerCase().includes(search.toLowerCase()) ||
    p.dni?.toLowerCase().includes(search.toLowerCase()) ||
    p.diagnosis.toLowerCase().includes(search.toLowerCase()),
  );

  if (selectedPatient) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => navigate(user?.role === 'TCAE' ? '/vitals' : '/patients')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {user?.role === 'TCAE' ? 'Volver a constantes' : 'Volver a pacientes'}
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{fullName(selectedPatient)}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {selectedPatient.diagnosis}
            </p>

          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedPatient.bed && (
              <span className="inline-flex items-center gap-1.5 text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-full">
                <BedDouble className="w-4 h-4" />
                Hab. {selectedPatient.bed.room}{selectedPatient.bed.letter}
              </span>
            )}
            {(() => {
              const sc = statusConfig[selectedPatient.status] ?? statusConfig.ESTABLE;
              return (
                <span className={`inline-flex items-center gap-1.5 text-sm ${sc.bg} ${sc.text} px-3 py-1.5 rounded-full`}>
                  <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                  {sc.label}
                </span>
              );
            })()}
            <span className="inline-flex items-center gap-1.5 text-sm bg-muted text-muted-foreground px-3 py-1.5 rounded-full">
              <Calendar className="w-4 h-4" />
              Ingreso: {new Date(selectedPatient.admissionDate).toLocaleDateString('es-ES')}
            </span>
            {isDoctor && (
              <>
                <button
                  onClick={() => { setNewStatus(selectedPatient.status); setShowStatusEdit(true); }}
                  className="inline-flex items-center gap-1.5 text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-200 transition-colors"
                >
                  <HeartPulse className="w-4 h-4" />
                  Cambiar estado
                </button>
                <button
                  onClick={() => { if (window.confirm(`¿Dar de alta a ${fullName(selectedPatient)}?`)) dischargeMutation.mutate(selectedPatient.id); }}
                  disabled={dischargeMutation.isPending}
                  className="inline-flex items-center gap-1.5 text-sm bg-destructive/10 text-destructive px-3 py-1.5 rounded-full hover:bg-destructive/20 transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  Dar de alta
                </button>
              </>
            )}
          </div>
        </div>

        {showStatusEdit && isDoctor && (
          <div className="bg-card border border-border rounded-xl p-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-1">Nuevo estado clínico</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ESTABLE">Estable</option>
                <option value="OBSERVACION">En observación</option>
                <option value="MODERADO">Moderado</option>
                <option value="CRITICO">Crítico</option>
              </select>
            </div>
            <button
              onClick={() => updateStatusMutation.mutate({ id: selectedPatient.id, status: newStatus })}
              disabled={updateStatusMutation.isPending}
              className="bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <Check className="w-4 h-4" /> Guardar
            </button>
            <button
              onClick={() => setShowStatusEdit(false)}
              className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {dischargeError && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{dischargeError}
          </div>
        )}

        {getAllergiesCount(selectedPatient.allergies) > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Alergias</p>
              <p className="text-sm text-destructive/80">{parseAllergies(selectedPatient.allergies).join(', ')}</p>
            </div>
          </div>
        )}

        {/* SYS-RF6: cronograma de tareas del paciente */}
        <PatientSchedule patientId={selectedPatient.id} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Pill className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Medicación activa</h3>
              {isDoctor && (
                <button
                  onClick={() => showMedForm ? closeMedForm() : setShowMedForm(true)}
                  className="ml-auto text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
                >
                  {showMedForm ? 'Cancelar' : 'Prescribir'}
                </button>
              )}
            </div>
            {patientMedications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin medicación activa</p>
            ) : (
              <ul className="space-y-3 mb-4">
                {patientMedications.map((med) => (
                  <li key={med.id} className="text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{med.drugName}</p>
                        <p className="text-muted-foreground mt-0.5">{med.dose} — cada {med.frequencyHrs}h — {med.route}</p>
                        {med.endDate ? (
                          <p className="text-[11px] text-amber-600 mt-0.5">Hasta: {new Date(med.endDate).toLocaleDateString('es-ES')}</p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground mt-0.5">Indefinida</p>
                        )}
                      </div>
                      {isDoctor && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openEditMed(med)}
                            className="p-1 rounded text-blue-500 hover:bg-blue-50 transition-colors"
                            title="Editar medicación"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { if (window.confirm(`¿Suspender ${med.drugName}?`)) deactivateMedMutation.mutate(med.id); }}
                            disabled={deactivateMedMutation.isPending}
                            className="p-1 rounded text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Suspender medicación"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {showMedForm && isDoctor && (
              <form
                onSubmit={handleSubmitMed((data) =>
                  editingMedId
                    ? editMedMutation.mutate({ ...data, id: editingMedId })
                    : createMedMutation.mutate(data)
                )}
                className="space-y-3 pt-4 border-t border-border"
              >
                <p className="text-xs font-bold text-foreground">{editingMedId ? 'Editar medicación' : 'Nueva prescripción'}</p>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Fármaco *</label>
                  <input type="text" placeholder="Nombre del fármaco" {...registerMed('drugName')}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  {medErrors.drugName && <p className="text-xs text-red-500 mt-1">{medErrors.drugName.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Nº Registro (opcional)</label>
                  <input type="text" placeholder="Ej: 123456" {...registerMed('nregistro')}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Dosis *</label>
                    <input type="text" placeholder="Ej: 500mg" {...registerMed('dose')}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                    {medErrors.dose && <p className="text-xs text-red-500 mt-1">{medErrors.dose.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Vía *</label>
                    <select {...registerMed('route')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="oral">Oral</option>
                      <option value="IV">Intravenosa</option>
                      <option value="SC">Subcutánea</option>
                      <option value="IM">Intramuscular</option>
                      <option value="TOPICAL">Tópica</option>
                    </select>
                    {medErrors.route && <p className="text-xs text-red-500 mt-1">{medErrors.route.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Frecuencia (horas) *</label>
                    <input type="number" min="1" {...registerMed('frequencyHrs', { valueAsNumber: true })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                    {medErrors.frequencyHrs && <p className="text-xs text-red-500 mt-1">{medErrors.frequencyHrs.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Inicio *</label>
                    <input type="datetime-local" {...registerMed('startTime')}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                    {medErrors.startTime && <p className="text-xs text-red-500 mt-1">{medErrors.startTime.message}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Duración</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" checked={isIndefinite} onChange={() => setMedValue('indefinite', true)}
                        className="accent-primary" />
                      Indefinida
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" checked={!isIndefinite} onChange={() => setMedValue('indefinite', false)}
                        className="accent-primary" />
                      Hasta fecha
                    </label>
                  </div>
                  {!isIndefinite && (
                    <input type="date" {...registerMed('endDate')}
                      className="mt-2 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  )}
                </div>
                {medFormError && (
                  <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">{medFormError}</p>
                )}
                <div className="flex gap-2">
                  <button type="submit" disabled={createMedMutation.isPending || editMedMutation.isPending}
                    className="flex-1 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {(createMedMutation.isPending || editMedMutation.isPending)
                      ? 'Guardando...'
                      : editingMedId ? 'Guardar cambios' : 'Prescribir Medicación'}
                  </button>
                  <button type="button" onClick={closeMedForm}
                    className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-chart-2" />
              <h3 className="font-semibold text-foreground">Constantes vitales</h3>
            </div>
            {patientVitals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin constantes registradas</p>
            ) : (
              <ul className="space-y-3">
                {patientVitals.slice(0, 5).map((v) => (
                  <li key={v.id} className="text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="text-muted-foreground">{new Date(v.recordedAt).toLocaleString('es-ES')}</p>
                    <p className="text-foreground mt-0.5">
                      TA: {v.bloodPressureSystolic}/{v.bloodPressureDiastolic} mmHg | FC: {v.heartRate} lpm | Tª: {v.temperature}ºC
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-chart-4" />
              <h3 className="font-semibold text-foreground">Registro de cuidados</h3>
            </div>
            {patientCareRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin registros de cuidados</p>
            ) : (
              <ul className="space-y-3">
                {patientCareRecords.slice(0, 5).map((cr) => (
                  <li key={cr.id} className="text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="text-muted-foreground">{new Date(cr.recordedAt).toLocaleString('es-ES')}</p>
                    <p className="text-foreground mt-0.5">{cr.notes}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Pruebas diagnósticas */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <TestTube className="w-5 h-5 text-violet-500" />
            <h3 className="font-semibold text-foreground">Pruebas diagnósticas</h3>
            <span className="text-xs bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
              {patientTests.filter(t => t.status !== 'CANCELLED').length}
            </span>
            {isDoctor && (
              <button
                onClick={() => setShowTestForm(v => !v)}
                className={`ml-auto flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${showTestForm ? 'bg-slate-200 text-slate-700' : 'bg-violet-600 text-white hover:bg-violet-700'}`}
              >
                {showTestForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {showTestForm ? 'Cancelar' : 'Asignar prueba'}
              </button>
            )}
          </div>

          {showTestForm && isDoctor && (
            <div className="px-5 py-4 border-b border-border bg-violet-50">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Tipo</label>
                  <select value={testType} onChange={e => setTestType(e.target.value as 'LAB' | 'IMAGING')}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-violet-400/30">
                    <option value="LAB">Laboratorio</option>
                    <option value="IMAGING">Diagnóstico por imagen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre *</label>
                  <input type="text" value={testName} onChange={e => setTestName(e.target.value)}
                    placeholder="ej: Hemograma, Rx Tórax..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 ring-violet-400/30" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Fecha programada *</label>
                  <input type="datetime-local" value={testDate} onChange={e => setTestDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-violet-400/30" />
                </div>
              </div>
              <button
                onClick={() => createTestMutation.mutate()}
                disabled={createTestMutation.isPending || !testName || !testDate}
                className="flex items-center gap-1.5 bg-violet-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {createTestMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Asignar prueba
              </button>
            </div>
          )}

          {loadingTests ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
          ) : patientTests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin pruebas diagnósticas</p>
          ) : (
            <ul className="divide-y divide-border">
              {patientTests.map(t => {
                const statusColors: Record<string, string> = {
                  REQUESTED: 'bg-amber-100 text-amber-700 border-amber-300',
                  APPROVED:  'bg-blue-100 text-blue-700 border-blue-300',
                  REJECTED:  'bg-red-100 text-red-700 border-red-300',
                  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
                  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-300',
                };
                const statusLabels: Record<string, string> = {
                  REQUESTED: 'Solicitada', APPROVED: 'Aprobada', REJECTED: 'Rechazada',
                  COMPLETED: 'Completada', CANCELLED: 'Cancelada',
                };
                return (
                  <li key={t.id} className="px-5 py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {t.type === 'LAB'
                          ? <FlaskConical className="w-4 h-4 text-orange-500" />
                          : <ImageIcon className="w-4 h-4 text-violet-500" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(t.scheduledAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {t.requestedBy ? ` · ${t.requestedBy}` : ''}
                        </p>
                        {t.result && (
                          <p className="text-xs bg-emerald-50 border border-emerald-100 rounded px-2 py-1 text-slate-700 mt-1">
                            <span className="font-bold text-emerald-700">Resultado: </span>{t.result}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${statusColors[t.status] ?? statusColors.APPROVED}`}>
                        {statusLabels[t.status] ?? t.status}
                      </span>
                      {isDoctor && t.status === 'REQUESTED' && (
                        <>
                          <button onClick={() => approveTestMutation.mutate(t.id)} disabled={approveTestMutation.isPending}
                            className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded hover:bg-emerald-600 transition-colors">
                            <ThumbsUp className="w-3 h-3" /> Aceptar
                          </button>
                          <button onClick={() => rejectTestMutation.mutate(t.id)} disabled={rejectTestMutation.isPending}
                            className="flex items-center gap-1 text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600 transition-colors">
                            <ThumbsDown className="w-3 h-3" /> Rechazar
                          </button>
                        </>
                      )}
                      {isDoctor && t.status !== 'COMPLETED' && (
                        <button onClick={() => cancelTestMutation.mutate(t.id)} disabled={cancelTestMutation.isPending}
                          title="Eliminar prueba"
                          className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded hover:bg-red-100 hover:text-red-600 transition-colors">
                          <Ban className="w-3 h-3" /> Cancelar
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <FileText className="w-5 h-5 text-chart-3" />
            <h3 className="font-semibold text-foreground">Historial completo</h3>
            <button
              onClick={() => navigate(`/history?patientId=${selectedPatient.id}`)}
              className="ml-auto text-sm text-primary hover:underline flex items-center gap-1"
            >
              Ver historial <ArrowLeft className="w-3 h-3 rotate-180" />
            </button>
          </div>
          <div className="p-5 text-sm text-muted-foreground">
            Acceso rápido al historial unificado del paciente
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {patients.length} paciente{patients.length !== 1 ? 's' : ''} en planta
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Buscar por nombre o diagnóstico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-72"
            />
          </div>
          {isDoctor && (
            <button
              onClick={() => { setShowForm(true); setDniSearch(''); setDniFound(null); }}
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Registrar ingreso
            </button>
          )}
        </div>
      </div>

      {/* Formulario de registro / re-ingreso */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Registro de ingreso</h2>
            <button onClick={() => { setShowForm(false); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Búsqueda por DNI */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-1">DNI del paciente</label>
              <input type="text" placeholder="Buscar por DNI..." value={dniSearch}
                onChange={(e) => setDniSearch(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button onClick={() => searchDniMutation.mutate(dniSearch)} disabled={!dniSearch || searchDniMutation.isPending}
              className="bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {searchDniMutation.isPending ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {searchDniMutation.isError && (
            <p className="text-sm text-muted-foreground">Paciente no encontrado. Puedes registrar uno nuevo con este DNI.</p>
          )}
          {dniFound && (
            <p className="text-sm text-green-600">✓ Paciente encontrado. Datos auto-rellenados (excepto diagnóstico).</p>
          )}

          <form onSubmit={handleSubmitAdm((data) => createPatientMutation.mutate(data))}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">DNI / NIE *</label>
                <input type="text" {...registerAdm('dni')} readOnly={!!dniFound}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-ring" />
                {admErrors.dni && <p className="text-xs text-red-500 mt-1">{admErrors.dni.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nombre *</label>
                <input type="text" {...registerAdm('name')} readOnly={!!dniFound}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-ring" />
                {admErrors.name && <p className="text-xs text-red-500 mt-1">{admErrors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Apellidos *</label>
                <input type="text" {...registerAdm('surnames')} readOnly={!!dniFound}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-ring" />
                {admErrors.surnames && <p className="text-xs text-red-500 mt-1">{admErrors.surnames.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Fecha de nacimiento *</label>
                <input type="date" {...registerAdm('dob')} readOnly={!!dniFound}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-ring" />
                {admErrors.dob && <p className="text-xs text-red-500 mt-1">{admErrors.dob.message}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Diagnóstico actual *</label>
                <input type="text" placeholder="Diagnóstico del ingreso actual..." {...registerAdm('diagnosis')}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-ring" />
                {admErrors.diagnosis && <p className="text-xs text-red-500 mt-1">{admErrors.diagnosis.message}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Estado clínico *</label>
                <select {...registerAdm('status')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="ESTABLE">Estable</option>
                  <option value="OBSERVACION">En observación</option>
                  <option value="MODERADO">Moderado</option>
                  <option value="CRITICO">Crítico</option>
                </select>
                {admErrors.status && <p className="text-xs text-red-500 mt-1">{admErrors.status.message}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Asignar cama (opcional)</label>
                <select {...registerAdm('bedId')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Sin asignar</option>
                  {freeBeds.map(b => (
                    <option key={b.id} value={b.id}>Hab. {b.room} — Cama {b.letter} (Planta {b.floor})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Alergias */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground mb-1">Alergias</label>
              <div className="flex items-end gap-2 mb-2">
                <input type="text" placeholder="Añadir alergia..." value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAllergy(); } }}
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <button type="button" onClick={handleAddAllergy}
                  className="bg-secondary text-secondary-foreground text-sm px-3 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  Añadir
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allergies.map(a => (
                  <span key={a} className="inline-flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                    {a}
                    <button type="button" onClick={() => handleRemoveAllergy(a)} className="hover:text-destructive/70"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {allergies.length === 0 && <span className="text-xs text-muted-foreground">Sin alergias</span>}
              </div>
            </div>

            {createError && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm flex items-center gap-2 mt-4">
                <AlertCircle className="w-4 h-4 shrink-0" />{createError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border">
              <button type="button" onClick={() => { setShowForm(false); }}
                className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button type="submit" disabled={createPatientMutation.isPending}
                className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" />
                {createPatientMutation.isPending ? 'Registrando...' : dniFound ? 'Re-ingreso' : 'Registrar ingreso'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
          No se pudieron cargar los pacientes. Verifica que el backend esté activo.
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {search ? 'Sin resultados para tu búsqueda' : 'No hay pacientes en planta'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium">Paciente</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Edad</th>
                  <th className="text-left px-5 py-3 font-medium">Diagnóstico</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Estado</th>
                  <th className="text-left px-5 py-3 font-medium hidden lg:table-cell">Cama</th>
                  <th className="text-left px-5 py-3 font-medium hidden lg:table-cell">Ingreso</th>
                  <th className="text-left px-5 py-3 font-medium">Alergias</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="border-t border-border hover:bg-accent/30 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-medium text-foreground">{fullName(p)}</td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">
                      {ageFromDob(p.dob)} años
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground max-w-52 truncate">
                      {p.diagnosis}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {(() => {
                        const sc = statusConfig[p.status] ?? statusConfig.ESTABLE;
                        return (
                          <span className={`inline-flex items-center gap-1 text-xs ${sc.bg} ${sc.text} px-2 py-0.5 rounded-full font-medium`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {p.bed ? (
                        <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          <BedDouble className="w-3 h-3" />
                          Hab. {p.bed.room}{p.bed.letter}
                        </span>
                      ) : assignBedPatientId === p.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={selectedBedId}
                            onChange={(e) => setSelectedBedId(e.target.value)}
                            className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 ring-primary/30"
                          >
                            <option value="">Seleccionar...</option>
                            {freeBeds.map((b) => (
                              <option key={b.id} value={b.id}>Hab. {b.room}{b.letter}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => selectedBedId && assignBedMutation.mutate({ bedId: selectedBedId, patientId: p.id })}
                            disabled={!selectedBedId || assignBedMutation.isPending}
                            className="p-0.5 rounded bg-primary text-white disabled:opacity-40 hover:bg-primary/80 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setAssignBedPatientId(null); setSelectedBedId(''); }}
                            className="p-0.5 rounded text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setAssignBedPatientId(p.id); setSelectedBedId(''); }}
                          className="inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors"
                        >
                          <BedDouble className="w-3 h-3" />
                          Asignar cama
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.admissionDate).toLocaleDateString('es-ES')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {getAllergiesCount(p.allergies) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                          <AlertCircle className="w-3 h-3" />
                          {parseAllergies(p.allergies).join(', ')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sin alergias</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
