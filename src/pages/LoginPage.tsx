import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Flame, ShieldAlert, Loader2 } from 'lucide-react';
import { loginSchema, type LoginInput } from '@/schemas/auth.schema';
import { useAuth } from '@/hooks/useAuth';
import { humanizeError } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const { session, user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  if (!loading && session && user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  }

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      await signIn(values.email.trim().toLowerCase(), values.password);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(humanizeError(err));
    }
  };

  return (
    <div
      className="grid min-h-dvh place-items-center p-5"
      style={{
        background:
          'radial-gradient(120% 80% at 12% 0%, oklch(0.225 0.060 32 / 0.55), transparent 62%),' +
          'radial-gradient(90% 70% at 100% 100%, oklch(0.20 0.040 322 / 0.7), transparent 60%),' +
          'oklch(var(--bg-deep))',
      }}
    >
      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex items-center gap-[10px]">
          <div className="grid size-9 place-items-center rounded-[10px] bg-ember shadow-[0_8px_28px_-8px_oklch(var(--ember)/.75)]">
            <Flame className="size-[19px] text-bg-deep" />
          </div>
          <div>
            <div className="text-[0.95rem] font-bold">Phoenix</div>
            <div className="text-[0.72rem] font-medium uppercase tracking-[0.06em] text-ink-3">
              Workforce Control
            </div>
          </div>
        </div>

        <h1 className="mb-1.5 text-xl">Вход в систему</h1>
        <p className="mb-6 text-sm text-ink-2">Закрытый контур. Учётные записи выдаёт администратор.</p>

        {serverError && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-[9px] rounded-sm border border-danger/50 bg-danger-dim px-3 py-2.5 text-[0.84rem] text-[oklch(0.88_0.08_30)]"
          >
            <ShieldAlert className="mt-px size-4 flex-none" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="space-y-4">
          <div className="space-y-[7px]">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="operator@phoenix.io"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
            {errors.email && <p className="text-[0.78rem] text-danger">{errors.email.message}</p>}
          </div>

          <div className="space-y-[7px]">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            {errors.password && <p className="text-[0.78rem] text-danger">{errors.password.message}</p>}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Проверяем доступ
              </>
            ) : (
              'Войти'
            )}
          </Button>
        </form>

        <p className="mt-5 border-t border-line-soft pt-4 text-[0.8rem] leading-relaxed text-ink-3">
          Регистрация закрыта. Забыли пароль? Обратитесь к руководителю смены: новый пароль выдаётся вручную.
        </p>
      </div>
    </div>
  );
}
