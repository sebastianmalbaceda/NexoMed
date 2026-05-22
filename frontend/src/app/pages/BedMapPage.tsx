import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BedDouble, Search, X, Activity, Loader2, UserPlus, Clock,
  ArrowRightLeft, Check, Pill, UserCheck, ExternalLink, LogOut,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { parseAllergies, getAllergiesCount } from '@/lib/patientUtils';
import type { Bed, Patient } from '@/lib/types';

const getPatientEmoji = (dobString: string) => {
  const age = new Date().getFullYear() - new Date(dobString).getFullYear();
  if (age >= 75) return '👵';
  if (age >= 65) return '👴';
  if (age >= 18) return '🧑';
  return '👶';
};

const getStatusStyles = (status: string) => {
  const statusMap: Record<string, { border: string; badge: string; text: string; bg: string }> = {
    CRITICO: { border: 'border-l-red-500', badge: 'bg-red-500', text: 'CRÍTICO', bg: 'bg-red-50/30' },
    MODERADO: { border: 'border-l-orange-400', badge: 'bg-orange-400', text: 'MODERADO', bg: 'bg-orange-50/30' },
    OBSERVACION: { border: 'border-l-amber-400', badge: 'bg-amber-400', text: 'OBSERVACIÓN', bg: 'bg-amber-50/30' },
    ESTABLE: { border: 'border-l-emerald-400', badge: 'bg-emerald-400', text: 'ESTABLE', bg: 'bg-emerald-50/30' },
  };
  return statusMap[status] ?? { border: 'border-l-emerald-400', badge: 'bg-emerald-400', text: 'ESTABLE', bg: 'bg-emerald-50/30' };
};

interface RoomGroup { room: number; beds: Bed[] }

type Tab = 'general' | 'my-patients';

const admitSchema = z.object({
  dni: z.string().min(1, 'El DNI es obligatorio'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  surnames: z.string().min(1, 'Los apellidos son obligatorios'),
  dob: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
  diagnosis: z.string().min(1, 'El diagnóstico es obligatorio'),
  status: z.enum(['ESTABLE', 'OBSERVACION', 'MODERADO', 'CRITICO']),
  allergiesText: z.string().optional(),
});

type AdmitForm = z.infer<typeof admitSchema>;

export default function BedMapPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdmitForm, setShowAdmitForm] = useState(false);
  const [admitError, setAdmitError] = useState('');
  const [dniSearch, setDniSearch] = useState('');
  const [dniFound, setDniFound] = useState<Patient | null>(null);
  const [showRelocateModal, setShowRelocateModal] = useState(false);
  const [relocateTarget, setRelocateTarget] = useState<string | null>(null);
  const [relocateError, setRelocateError] = useState('');

  const {
    register: registerAdmit,
    handleSubmit: handleSubmitAdmit,
    reset: resetAdmit,
    formState: { errors: admitErrors },
  } = useForm<AdmitForm>({
    resolver: zodResolver(admitSchema),
    defaultValues: {
      dni: '', name: '', surnames: '', dob: '', diagnosis: '', status: 'ESTABLE', allergiesText: '',
    },
  });

  const { data: beds = [], isLoading } = useQuery({
    queryKey: ['beds'],
    queryFn: () => api.get<Bed[]>('/beds'),
  });

  const roomsGrouped: RoomGroup[] = useMemo(() => {
    const map = new Map<number, Bed[]>();
    for (const bed of beds) {
      if (!map.has(bed.room)) map.set(bed.room, []);
      map.get(bed.room)!.push(bed);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([room, bedList]) => ({ room, beds: bedList }));
  }, [beds]);

  const myPatientBeds = useMemo(() =>
    beds.filter(b => b.patient?.assignedNurseId === user?.id),
  [beds, user]);

  const myPatientRooms: RoomGroup[] = useMemo(() => {
    const map = new Map<number, Bed[]>();
    for (const bed of myPatientBeds) {
      if (!map.has(bed.room)) map.set(bed.room, []);
      map.get(bed.room)!.push(bed);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([room, bedList]) => ({ room, beds: bedList }));
  }, [myPatientBeds]);

  const freeBeds = useMemo(() => beds.filter(b => !b.patient), [beds]);

  const sourceRooms = activeTab === 'general' ? roomsGrouped : myPatientRooms;

  const filteredRooms = sourceRooms.filter(room =>
    room.room.toString().includes(searchTerm) ||
    room.beds.some(b =>
      b.patient?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.patient?.surnames ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.patient?.dni?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const admitMutation = useMutation({
    mutationFn: async (payload: AdmitForm & { bedId: string }) => {
      const allergies = payload.allergiesText ? payload.allergiesText.split(',').map(s => s.trim()).filter(Boolean) : [];
      return api.post<Patient>('/patients', {
        dni: payload.dni.trim(),
        name: payload.name.trim(),
        surnames: payload.surnames.trim(),
        dob: new Date(payload.dob).toISOString(),
        diagnosis: payload.diagnosis.trim(),
        status: payload.status,
        allergies,
        bedId: payload.bedId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beds'] });
      qc.invalidateQueries({ queryKey: ['patients'] });
      setSelectedBed(null);
      setShowAdmitForm(false);
      resetAdmit();
      setAdmitError('');
      setDniSearch('');
      setDniFound(null);
    },
    onError: (e: Error) => setAdmitError(e.message),
  });

  const searchDniMutation = useMutation({
    mutationFn: (dni: string) => api.get<Patient>(`/patients/search?dni=${encodeURIComponent(dni)}`),
    onSuccess: (patient) => {
      setDniFound(patient);
      resetAdmit({
        dni: patient.dni ?? '',
        name: patient.name,
        surnames: patient.surnames ?? '',
        dob: patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : '',
        diagnosis: '',
        status: (patient.status as AdmitForm['status']) ?? 'ESTABLE',
        allergiesText: (patient.allergies ?? []).join(', '),
      });
    },
    onError: () => {
      setDniFound(null);
      resetAdmit({
        dni: dniSearch,
        name: '',
        surnames: '',
        dob: '',
        diagnosis: '',
        status: 'ESTABLE',
        allergiesText: '',
      });
    },
  });

  const dischargeMutation = useMutation({
    mutationFn: (id: string) => api.put(`/patients/${id}/discharge`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beds'] });
      qc.invalidateQueries({ queryKey: ['patients'] });
      setSelectedBed(null);
    },
  });

  const relocateMutation = useMutation({
    mutationFn: ({ sourceBedId, targetBedId }: { sourceBedId: string; targetBedId: string }) =>
      api.put<Bed>(`/beds/${sourceBedId}/relocate`, { targetBedId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beds'] });
      setShowRelocateModal(false);
      setRelocateTarget(null);
      setRelocateError('');
      setSelectedBed(null);
    },
    onError: (e: Error) => setRelocateError(e.message),
  });

  // Nurse self-assignment — optimistic: updates local cache; backend endpoint pending
  const assignNurseMutation = useMutation({
    mutationFn: (patientId: string) =>
      api.put(`/patients/${patientId}`, { assignedNurseId: user?.id }),
    onMutate: async (patientId: string) => {
      qc.setQueryData(['beds'], (old: Bed[] | undefined) =>
        old?.map(b =>
          b.patient?.id === patientId
            ? { ...b, patient: { ...b.patient!, assignedNurseId: user?.id ?? null } }
            : b
        )
      );
      if (selectedBed?.patient?.id === patientId) {
        setSelectedBed(prev =>
          prev?.patient ? { ...prev, patient: { ...prev.patient, assignedNurseId: user?.id ?? null } } : prev
        );
      }
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['beds'] });
    },
  });

  const unassignNurseMutation = useMutation({
    mutationFn: (patientId: string) =>
      api.put(`/patients/${patientId}`, { assignedNurseId: null }),
    onMutate: async (patientId: string) => {
      qc.setQueryData(['beds'], (old: Bed[] | undefined) =>
        old?.map(b =>
          b.patient?.id === patientId
            ? { ...b, patient: { ...b.patient!, assignedNurseId: null } }
            : b
        )
      );
      if (selectedBed?.patient?.id === patientId) {
        setSelectedBed(prev =>
          prev?.patient ? { ...prev, patient: { ...prev.patient, assignedNurseId: null } } : prev
        );
      }
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['beds'] });
    },
  });

  const occupiedCount = beds.filter(b => b.patient).length;
  const isNurse = user?.role === 'NURSE';
  const isDoctor = user?.role === 'DOCTOR';

  const canRelocate = isDoctor || isNurse;
  const canAdmit = isDoctor || isNurse;

  const closePanel = () => {
    setSelectedBed(null);
    setShowAdmitForm(false);
    setShowRelocateModal(false);
    setDniSearch('');
    setDniFound(null);
    resetAdmit();
  };

  return (
    <div className="relative min-h-screen bg-[#f9fafb] p-4 md:p-8 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Planta 1</span>
              <span className="text-slate-400 text-[10px] font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" /> Turno actual
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mapa de Camas</h1>
            <p className="text-slate-500 text-sm font-medium">{occupiedCount}/24 camas ocupadas</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar paciente o habitación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 ring-blue-500/20 outline-none text-sm"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 bg-white rounded-2xl border border-slate-200 p-1 w-fit shadow-sm">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'general'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <BedDouble className="w-3.5 h-3.5" /> General
              <span className={`text-[10px] font-black px-1.5 rounded-full ${activeTab === 'general' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {occupiedCount}
              </span>
            </span>
          </button>
          {isNurse && (
            <button
              onClick={() => setActiveTab('my-patients')}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'my-patients'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5" /> Mis Pacientes
                <span className={`text-[10px] font-black px-1.5 rounded-full ${activeTab === 'my-patients' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                  {myPatientBeds.length}
                </span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Bed grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-full py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-500" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <BedDouble className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            {activeTab === 'my-patients' ? (
              <>
                <p className="text-slate-400 font-bold">No tienes pacientes asignados</p>
                <p className="text-slate-300 text-xs mt-1">Usa el mapa General y asígnate pacientes</p>
              </>
            ) : (
              <p className="text-slate-400 font-bold">No se encontraron camas</p>
            )}
          </div>
        ) : (
          filteredRooms.map((roomGroup) => (
            <div key={roomGroup.room} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
                  Habitación {roomGroup.room}
                </span>
              </div>
              <div className="p-3 space-y-2">
                {roomGroup.beds.map((bed) => {
                  const patient = bed.patient;
                  const isOccupied = !!patient;
                  const styles = isOccupied ? getStatusStyles(patient.status) : null;
                  const isCritical = patient?.status === 'CRITICO';
                  const isMyPatient = patient?.assignedNurseId === user?.id;

                  return (
                    <div
                      key={bed.id}
                      onClick={() => setSelectedBed(bed)}
                      className={`group cursor-pointer relative rounded-xl border p-3 transition-all hover:shadow-sm
                        ${isOccupied
                          ? `border-l-4 ${styles?.border} bg-white hover:bg-slate-50`
                          : 'border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/80'
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5">
                          <BedDouble className={`w-3.5 h-3.5 ${isOccupied ? 'text-slate-700' : 'text-slate-300'}`} />
                          <span className="font-bold text-slate-800 text-xs">{bed.letter}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isMyPatient && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-blue-500 text-white">MÍO</span>
                          )}
                          {isOccupied && (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded text-white tracking-widest ${styles?.badge}`}>
                              {styles?.text}
                            </span>
                          )}
                        </div>
                      </div>

                      {isOccupied ? (
                        <div className="mt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{getPatientEmoji(patient.dob)}</span>
                            <div className="flex items-center gap-1 min-w-0">
                              <p className="font-semibold text-slate-800 text-xs leading-tight truncate">
                                {patient.name} {patient.surnames}
                              </p>
                              {(() => {
                                const dotColors: Record<string, string> = { ESTABLE: 'bg-emerald-500', OBSERVACION: 'bg-amber-500', MODERADO: 'bg-orange-500', CRITICO: 'bg-red-500' };
                                return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[patient.status] ?? 'bg-emerald-500'}`} />;
                              })()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-100">
                            {patient.allergies && getAllergiesCount(patient.allergies) > 0 && (
                              <span className="text-[8px] font-bold text-red-500">🚫 ALERGIA</span>
                            )}
                            {isCritical && <span className="text-[8px] animate-bounce">⚠️</span>}
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Libre</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Side panel */}
      {selectedBed && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={closePanel} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Detalles de Unidad</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  Habitación {selectedBed.room} — Cama {selectedBed.letter}
                </p>
              </div>
              <button onClick={closePanel} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {selectedBed.patient ? (
                <div className="space-y-6">
                  {/* Patient header */}
                  <div className="flex items-center gap-5 p-4 bg-slate-900 rounded-3xl shadow-xl shadow-slate-200">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-4xl">
                      {getPatientEmoji(selectedBed.patient.dob)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">
                        {selectedBed.patient.name} {selectedBed.patient.surnames}
                      </h3>
                      <p className="text-blue-300 text-xs font-bold mt-1">
                        NHC: {selectedBed.patient.id.slice(0, 8).toUpperCase()}
                      </p>
                      {selectedBed.patient.assignedNurseId && (
                        <p className="text-emerald-300 text-[10px] font-bold mt-0.5 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          {selectedBed.patient.assignedNurseId === user?.id ? 'Tu paciente' : 'Asignado'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Activity className="w-3 h-3" /> Juicio Clínico
                    </label>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed font-medium">
                      "{selectedBed.patient.diagnosis}"
                    </div>
                  </div>

                  {/* Allergies */}
                  <div className={`p-4 rounded-2xl border ${getAllergiesCount(selectedBed.patient.allergies) > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    <p className={`text-[10px] font-black uppercase mb-1 ${getAllergiesCount(selectedBed.patient.allergies) > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      🚫 Alergias
                    </p>
                    <p className={`text-xs font-bold ${getAllergiesCount(selectedBed.patient.allergies) > 0 ? 'text-red-900' : 'text-emerald-900'}`}>
                      {parseAllergies(selectedBed.patient.allergies).join(', ') || 'Sin alergias conocidas'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    {/* Ver paciente — todos los roles */}
                    <button
                      onClick={() => {
                        closePanel();
                        navigate(user?.role === 'TCAE'
                          ? `/vitals?patientId=${selectedBed.patient!.id}`
                          : `/patients/${selectedBed.patient!.id}`);
                      }}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                    >
                      <ExternalLink className="w-4 h-4" /> Ver ficha del paciente
                    </button>

                    {/* Nurse assignment */}
                    {isNurse && (
                      selectedBed.patient.assignedNurseId === user?.id ? (
                        <button
                          onClick={() => unassignNurseMutation.mutate(selectedBed.patient!.id)}
                          disabled={unassignNurseMutation.isPending}
                          className="w-full py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                        >
                          <UserCheck className="w-4 h-4" /> Desasignarme
                        </button>
                      ) : (
                        <button
                          onClick={() => assignNurseMutation.mutate(selectedBed.patient!.id)}
                          disabled={assignNurseMutation.isPending}
                          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                        >
                          <UserCheck className="w-4 h-4" /> Asignarme este paciente
                        </button>
                      )
                    )}

                    {/* Prescribe — doctor */}
                    {isDoctor && (
                      <button
                        onClick={() => navigate('/doctor', { state: { patientId: selectedBed.patient!.id } })}
                        className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-100"
                      >
                        <Pill className="w-4 h-4" /> Pautar Medicación
                      </button>
                    )}

                    {/* Relocate */}
                    {canRelocate && (
                      <button
                        onClick={() => setShowRelocateModal(true)}
                        className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                      >
                        <ArrowRightLeft className="w-4 h-4" /> Reubicar Paciente
                      </button>
                    )}

                    {/* Discharge — doctor only */}
                    {isDoctor && (
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Dar de alta a ${selectedBed.patient!.name} ${selectedBed.patient!.surnames}? Se liberará la cama.`)) {
                            dischargeMutation.mutate(selectedBed.patient!.id);
                          }
                        }}
                        disabled={dischargeMutation.isPending}
                        className="w-full py-3.5 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <LogOut className="w-4 h-4" /> Dar de Alta al Paciente
                      </button>
                    )}

                  </div>
                </div>
              ) : (
                /* Empty bed */
                <div className="py-6">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
                      <BedDouble className="w-8 h-8 text-slate-200" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">Unidad Vacía</h3>
                    <p className="text-xs text-slate-400 mt-2">Esta cama está lista para un nuevo ingreso.</p>
                  </div>

                  {canAdmit && !showAdmitForm && (
                    <button
                      onClick={() => setShowAdmitForm(true)}
                      className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-all"
                    >
                      <UserPlus className="w-5 h-5" /> Registrar Ingreso
                    </button>
                  )}

                  {canAdmit && showAdmitForm && (
                    <form onSubmit={handleSubmitAdmit((data) => { if (selectedBed) admitMutation.mutate({ ...data, bedId: selectedBed.id }); })} className="space-y-3">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-4">Datos del paciente</p>

                      {/* DNI Search */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Buscar por DNI</label>
                        <div className="flex gap-2">
                          <input type="text" placeholder="123456789" value={dniSearch}
                            onChange={(e) => setDniSearch(e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 ring-slate-300" />
                          <button type="button" onClick={() => searchDniMutation.mutate(dniSearch)}
                            disabled={!dniSearch || searchDniMutation.isPending}
                            className="px-4 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all disabled:opacity-50 flex items-center gap-1"
                          >
                            {searchDniMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Buscar
                          </button>
                        </div>
                      </div>

                      {searchDniMutation.isError && (
                        <p className="text-xs text-slate-400">Paciente no encontrado. Puedes registrar uno nuevo con este DNI.</p>
                      )}
                      {dniFound && (
                        <p className="text-xs text-emerald-600 font-medium">✓ Paciente encontrado. Datos auto-rellenados.</p>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">DNI / NIE *</label>
                        <input type="text" placeholder="123456789" {...registerAdmit('dni')} readOnly={!!dniFound}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 ring-slate-300 disabled:opacity-60" />
                        {admitErrors.dni && <p className="text-xs text-red-500 mt-1">{admitErrors.dni.message}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nombre *</label>
                        <input type="text" placeholder="Nombre" {...registerAdmit('name')} readOnly={!!dniFound}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 ring-slate-300 disabled:opacity-60" />
                        {admitErrors.name && <p className="text-xs text-red-500 mt-1">{admitErrors.name.message}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Apellidos *</label>
                        <input type="text" placeholder="Apellidos" {...registerAdmit('surnames')} readOnly={!!dniFound}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 ring-slate-300 disabled:opacity-60" />
                        {admitErrors.surnames && <p className="text-xs text-red-500 mt-1">{admitErrors.surnames.message}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Fecha de nacimiento *</label>
                        <input type="date" {...registerAdmit('dob')}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 ring-slate-300" />
                        {admitErrors.dob && <p className="text-xs text-red-500 mt-1">{admitErrors.dob.message}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Diagnóstico *</label>
                        <input type="text" placeholder="Diagnóstico principal" {...registerAdmit('diagnosis')}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 ring-slate-300" />
                        {admitErrors.diagnosis && <p className="text-xs text-red-500 mt-1">{admitErrors.diagnosis.message}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Estado clínico *</label>
                        <select {...registerAdmit('status')}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 ring-slate-300">
                          <option value="ESTABLE">Estable</option>
                          <option value="OBSERVACION">En observación</option>
                          <option value="MODERADO">Moderado</option>
                          <option value="CRITICO">Crítico</option>
                        </select>
                        {admitErrors.status && <p className="text-xs text-red-500 mt-1">{admitErrors.status.message}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Alergias (separadas por coma)</label>
                        <input type="text" placeholder="penicilina, ibuprofeno..." {...registerAdmit('allergiesText')}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 ring-slate-300" />
                      </div>

                      {admitError && <p className="text-xs text-red-600 font-medium">{admitError}</p>}

                      <div className="flex gap-2 pt-2">
                        <button type="submit" disabled={admitMutation.isPending}
                          className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50"
                        >
                          {admitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                          Confirmar
                        </button>
                        <button type="button" onClick={() => { setShowAdmitForm(false); resetAdmit(); setAdmitError(''); }}
                          className="px-4 py-3 border border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition-all text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Relocate modal */}
      {showRelocateModal && selectedBed?.patient && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
            onClick={() => { setShowRelocateModal(false); setRelocateTarget(null); setRelocateError(''); }} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Reubicar Paciente</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedBed.patient.name} {selectedBed.patient.surnames} → Hab. {selectedBed.room} Cama {selectedBed.letter}
                  </p>
                </div>
                <button onClick={() => { setShowRelocateModal(false); setRelocateTarget(null); setRelocateError(''); }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Selecciona cama destino</p>
                {freeBeds.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No hay camas libres disponibles</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {freeBeds.map(bed => {
                      const isSel = relocateTarget === bed.id;
                      return (
                        <button key={bed.id} onClick={() => setRelocateTarget(bed.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${isSel ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSel ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <BedDouble className="w-4 h-4" />
                          </div>
                          <p className="text-xs font-bold text-slate-800">Hab. {bed.room} - Cama {bed.letter}</p>
                          {isSel && <Check className="w-4 h-4 text-blue-500 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {relocateError && <p className="text-xs text-red-600 font-medium mt-4">{relocateError}</p>}
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3">
                <button onClick={() => { setShowRelocateModal(false); setRelocateTarget(null); setRelocateError(''); }}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50">
                  Cancelar
                </button>
                <button
                  onClick={() => { if (!relocateTarget) return; relocateMutation.mutate({ sourceBedId: selectedBed.id, targetBedId: relocateTarget }); }}
                  disabled={!relocateTarget || relocateMutation.isPending}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {relocateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRightLeft className="w-4 h-4" /> Confirmar</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
