import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, ShieldPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { SEED_CREDENTIALS } from '@/lib/constants';
import type { LoginResponse } from '@/lib/types';

const loginSchema = z.object({
  email: z.string().min(1, 'El email es obligatorio').email('Email no válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) =>
      api.post<LoginResponse>('/auth/login', data),
    onSuccess: (result) => {
      setAuth(result.token, result.user);
      navigate('/dashboard', { replace: true });
    },
  });

  const serverError = loginMutation.error
    ? loginMutation.error.message === 'Credenciales incorrectas'
      ? 'Credenciales incorrectas'
      : 'Error del servidor. Inténtalo de nuevo.'
    : null;

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50">
      <div className="w-[90%] max-w-[400px] bg-white rounded-[1.25rem] p-7 shadow-md border border-gray-100 flex flex-col items-center">
        <div className="bg-slate-900 w-12 h-12 rounded-xl mb-4 flex items-center justify-center">
          <ShieldPlus color="white" size={28} strokeWidth={2.5} />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">
          NexoMed
        </h1>
        <p className="text-gray-400 text-sm mb-6 text-center">
          Sistema de Gestión Clínica Hospitalaria
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4 mb-6">
          <div>
            <label className="block font-semibold mb-1 text-gray-700 text-xs">
              Correo electrónico
            </label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
              <input
                type="email"
                {...register('email')}
                placeholder="usuario@nexomed.es"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-800 outline-none font-medium"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block font-semibold mb-1 text-gray-700 text-xs">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-800 outline-none font-medium"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-red-500 text-center">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-black text-white py-3 rounded-lg text-sm font-semibold border-none cursor-pointer flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
          >
            {loginMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            <span>Iniciar Sesión</span>
          </button>
        </form>

        <div className="w-full border-t border-gray-100 pt-4">
          <div className="flex gap-2 mb-1.5">
            <span className="text-sm">💡</span>
            <p className="m-0 text-xs text-gray-400">
              <span className="text-gray-500 font-medium">Demo:</span> Usa las credenciales del seed
            </p>
          </div>
          {SEED_CREDENTIALS.map((cred) => (
            <div key={cred.email} className="flex gap-2 mb-1 last:mb-0">
              <span className="text-sm">
                {cred.role === 'DOCTOR' ? '👨‍⚕️' : cred.role === 'NURSE' ? '👩‍⚕️' : '🏥'}
              </span>
              <p className="m-0 text-xs text-gray-400">{cred.email} / {cred.password}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 text-center">
        <p className="text-xs text-gray-400 font-normal m-0">
          NexoMed v1.0 — Sistema Hospitalario Integrado
        </p>
      </div>
    </div>
  );
}
