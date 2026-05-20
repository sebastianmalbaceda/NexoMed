import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Loader2, CheckCheck, ThumbsUp, ThumbsDown, TestTube } from 'lucide-react';
import { api } from '@/lib/api';
import { NOTIFICATION_TYPE_LABELS, POLLING_INTERVAL_MS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import type { Notification } from '@/lib/types';

const TYPE_COLORS: Record<string, string> = {
  MED_NEW:        'bg-blue-50 text-blue-700 border-blue-200',
  MED_CHANGE:     'bg-amber-50 text-amber-700 border-amber-200',
  MED_REMOVED:    'bg-red-50 text-red-700 border-red-200',
  INCIDENT_NEW:   'bg-orange-50 text-orange-700 border-orange-200',
  TEST_REQUESTED: 'bg-violet-50 text-violet-700 border-violet-200',
  TEST_REVIEWED:  'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isDoctor = user?.role === 'DOCTOR';

  const { data: notifications = [], isLoading, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications'),
    refetchInterval: POLLING_INTERVAL_MS,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.put<Notification>(`/notifications/${id}/read`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const testActionMutation = useMutation({
    mutationFn: ({ testId, status, notifId }: { testId: string; status: string; notifId: string }) =>
      api.put(`/tests/${testId}/status`, { status }).then(() =>
        api.put(`/notifications/${notifId}/read`, {})
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['tests'] });
    },
  });

  const markAllRead = () => {
    notifications.filter((n) => !n.read).forEach((n) => markReadMutation.mutate(n.id));
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notificaciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Actualización automática cada 5 s
            {unread > 0 && (
              <span className="ml-2 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full font-semibold">
                {unread} sin leer
              </span>
            )}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            disabled={markReadMutation.isPending}
            className="flex items-center gap-2 text-sm text-primary hover:underline disabled:opacity-60"
          >
            <CheckCheck className="w-4 h-4" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {isError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
          No se pudieron cargar las notificaciones.
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <BellOff className="w-10 h-10 opacity-40" />
            <p>Sin notificaciones</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((n) => {
              const isTestRequest = n.type === 'TEST_REQUESTED' && isDoctor && !!n.relatedTestId && !n.read;
              const isPending = testActionMutation.isPending && testActionMutation.variables?.notifId === n.id;

              return (
                <li
                  key={n.id}
                  className={`px-5 py-4 flex items-start gap-4 transition-opacity ${n.read ? 'opacity-50' : ''}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {n.type === 'TEST_REQUESTED' ? (
                      <TestTube className="w-4 h-4 text-violet-500" />
                    ) : (
                      <Bell className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[n.type] ?? 'bg-muted text-muted-foreground border-border'}`}>
                        {NOTIFICATION_TYPE_LABELS[n.type] ?? n.type}
                      </span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>

                    <p className="text-sm text-foreground">{n.message}</p>

                    {(n.patientName || n.patientBed) && (
                      <p className="text-xs font-medium text-primary mt-1">
                        {n.patientName}{n.patientName && n.patientBed ? ' — ' : ''}{n.patientBed}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString('es-ES', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>

                    {/* Botones Aceptar / Rechazar para el doctor */}
                    {isTestRequest && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => testActionMutation.mutate({ testId: n.relatedTestId!, status: 'APPROVED', notifId: n.id })}
                          disabled={isPending}
                          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                          Aceptar
                        </button>
                        <button
                          onClick={() => testActionMutation.mutate({ testId: n.relatedTestId!, status: 'REJECTED', notifId: n.id })}
                          disabled={isPending}
                          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsDown className="w-3 h-3" />}
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>

                  {!n.read && !isTestRequest && (
                    <button
                      onClick={() => markReadMutation.mutate(n.id)}
                      disabled={markReadMutation.isPending}
                      className="text-xs text-muted-foreground hover:text-foreground shrink-0 disabled:opacity-60"
                    >
                      Leída
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
