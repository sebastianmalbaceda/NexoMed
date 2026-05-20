import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';
import { BASE_URL } from '@/lib/api';

export function useNotificationToast() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const hasShownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!token) return;

    const url = `${BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.addEventListener('connected', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    es.addEventListener('notification', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (hasShownRef.current.has(data.id)) return;
        hasShownRef.current.add(data.id);

        let title = 'Notificación';
        const patientInfo = [data.patientName, data.patientBed].filter(Boolean).join(' — ');
        const description = patientInfo
          ? `${patientInfo}\n${data.message || 'Nueva notificación recibida'}`
          : (data.message || 'Nueva notificación recibida');
        
        if (data.type === 'TEST_NEW') {
          title = '🧪 Nueva prueba diagnóstica';
        } else if (data.type === 'MED_NEW') {
          title = '💊 Nueva medicación';
        } else if (data.type === 'MED_CHANGE') {
          title = '💊 Cambio de medicación';
        } else if (data.type === 'MED_REMOVED') {
          title = '💊 Medicación retirada';
        }

        toast({
          title,
          description,
          variant: 'default',
        });
      } catch (err) {
        console.error('[SSE] Error parseando notificación', err);
      }
      
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    es.onerror = () => {
      console.warn('[SSE] error/desconexión — reintentando…');
    };

    return () => {
      es.close();
    };
  }, [token, queryClient]);
}