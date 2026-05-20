import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  BedDouble,
  Bell,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { NOTIFICATION_TYPE_LABELS, POLLING_INTERVAL_MS } from '@/lib/constants';
import type { Patient, Bed, Notification } from '@/lib/types';

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-muted-foreground text-sm mb-1">{label}</p>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
        ) : (
          <span className="text-3xl font-bold text-foreground">{value}</span>
        )}
      </div>
      <div className={`${colorClass} w-11 h-11 rounded-lg flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}

export function DashboardOverview() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const role = user?.role ?? 'NURSE';

  const { data: patients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get<Patient[]>('/patients'),
  });

  const { data: beds = [], isLoading: loadingBeds } = useQuery({
    queryKey: ['beds'],
    queryFn: () => api.get<Bed[]>('/beds'),
  });

  const { data: notifications = [], isLoading: loadingNotifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications'),
    refetchInterval: POLLING_INTERVAL_MS,
    enabled: role === 'NURSE' || role === 'DOCTOR',
  });

  const occupiedBeds = beds.filter((b) => b.patient != null).length;
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Pacientes en planta"
          value={patients.length}
          icon={Users}
          colorClass="bg-chart-2"
          loading={loadingPatients}
        />
        <StatCard
          label="Camas ocupadas"
          value={`${occupiedBeds} / ${beds.length}`}
          icon={BedDouble}
          colorClass="bg-chart-3"
          loading={loadingBeds}
        />
        {(role === 'NURSE' || role === 'DOCTOR') && (
          <StatCard
            label="Notificaciones sin leer"
            value={unreadNotifs}
            icon={Bell}
            colorClass={unreadNotifs > 0 ? 'bg-destructive' : 'bg-chart-1'}
            loading={loadingNotifs}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient table (2/3) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-slate-900 px-5 py-4 flex items-center justify-between border-b border-border">
            <h3 className="font-semibold text-white">Pacientes en planta</h3>
            <button
              onClick={() => navigate('/patients')}
              className="text-xs text-white hover:underline flex items-center gap-1"
            >
              Ver todos <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {loadingPatients ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : patients.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-12">
              No hay pacientes en planta
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-600 text-white text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-2.5 font-medium">Paciente</th>
                    <th className="text-left px-5 py-2.5 font-medium hidden md:table-cell">Diagnóstico</th>
                    <th className="text-left px-5 py-2.5 font-medium">Cama</th>
                    <th className="text-left px-5 py-2.5 font-medium hidden lg:table-cell">Alergias</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.slice(0, 8).map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-border hover:bg-accent/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/patients/${p.id}`)}
                    >
                      <td className="px-5 py-3 font-medium text-foreground">{p.name} {p.surnames}</td>
                      <td className="px-5 py-3 text-muted-foreground hidden md:table-cell truncate max-w-50">
                        {p.diagnosis}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {p.bed ? `Hab. ${p.bed.room}${p.bed.letter}` : '—'}
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        {p.allergies.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            {p.allergies.length} alergia{p.allergies.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notifications panel (1/3) */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-slate-900 px-5 py-4 flex items-center justify-between border-b border-border">
            <h3 className="font-semibold text-white">Notificaciones recientes</h3>
            <button
              onClick={() => navigate('/notifications')}
              className="text-xs text-white hover:underline flex items-center gap-1"
            >
              Ver todas <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {role === 'TCAE' ? (
            <p className="text-muted-foreground text-sm text-center py-12 px-4">
              Sin notificaciones para tu rol
            </p>
          ) : loadingNotifs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-12">
              Sin notificaciones
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.slice(0, 5).map((n) => (
                <li key={n.id} className={`px-5 py-3 ${n.read ? 'opacity-60' : ''}`}>
                  <p className="text-sm font-medium text-foreground">
                    {NOTIFICATION_TYPE_LABELS[n.type] ?? n.type}
                  </p>
                  {(n.patientName || n.patientBed) && (
                    <p className="text-xs font-medium text-primary mt-0.5">
                      {n.patientName}{n.patientName && n.patientBed ? ' — ' : ''}{n.patientBed}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {new Date(n.createdAt).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Mini bed map */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between border-b border-border">
          <h3 className="font-semibold text-white">Estado de camas</h3>
          <button
            onClick={() => navigate('/beds')}
            className="text-xs text-white hover:underline flex items-center gap-1"
          >
            Mapa completo <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {loadingBeds ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {beds.map((bed) => (
                <button
                  key={bed.id}
                  onClick={() => navigate('/beds')}
                  title={
                    bed.patient
                      ? `${bed.patient.name} ${bed.patient.surnames} — Hab. ${bed.room}${bed.letter}`
                      : `Hab. ${bed.room}${bed.letter} — Libre`
                  }
                  className={`w-10 h-10 rounded-lg border-2 text-xs font-semibold transition-colors ${
                    bed.patient
                      ? 'bg-primary/20 border-primary/40 text-primary hover:bg-primary/30'
                      : 'bg-muted border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {bed.room}{bed.letter}
                </button>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-primary/20 border border-primary/40 inline-block" />
                Ocupada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-muted border border-border inline-block" />
                Libre
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
