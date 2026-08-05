import { Ban } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function BlockedPage() {
  const { signOut, user } = useAuth();
  return (
    <div className="grid min-h-dvh place-items-center bg-bg-deep p-6 text-center">
      <div className="max-w-[42ch]">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-md border border-danger/40 bg-danger-dim">
          <Ban className="size-6 text-danger" />
        </div>
        <h1 className="mb-2 text-xl">Доступ приостановлен</h1>
        <p className="mb-6 text-sm text-ink-2">
          {user?.fullName}, ваша учётная запись заблокирована администратором. Активная смена закрыта
          автоматически. Свяжитесь с руководителем, чтобы восстановить доступ.
        </p>
        <Button variant="secondary" onClick={() => void signOut()}>
          Выйти
        </Button>
      </div>
    </div>
  );
}
