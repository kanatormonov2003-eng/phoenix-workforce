import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <div className="num text-[clamp(5rem,18vw,10rem)] font-bold leading-[0.85] tracking-[-0.06em] text-surface-3">
          4<span className="text-ember">0</span>4
        </div>
        <h1 className="mb-2 mt-6 text-lg">Страница ушла со смены</h1>
        <p className="mb-7 text-sm text-ink-2">Такого маршрута нет или у вас нет к нему доступа.</p>
        <Button onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/', { replace: true })}>
          Вернуться на панель
        </Button>
      </div>
    </div>
  );
}
