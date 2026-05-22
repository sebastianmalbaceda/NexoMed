import { useAuthStore } from '@/store/authStore';

export const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

/** Generic fetch wrapper — adds Bearer token and returns the JSON body directly */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = `${BASE_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(fullUrl, { ...options, headers });
  } catch {
    throw new Error('Error de conexión. Verifica que el servidor esté activo.');
  }

  // Redirect to login on expired / invalid token
  if (response.status === 401) {
    useAuthStore.getState().clearAuth();
    window.location.replace('/login');
    throw new Error('Sesión expirada. Por favor, inicia sesión de nuevo.');
  }

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ error: `HTTP ${response.status}` })) as { error?: string };
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  const json = await response.json() as T;
  return json;
}

export const api = {
  get:    <T>(endpoint: string) =>
    request<T>(endpoint),

  post:   <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),

  put:    <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};
