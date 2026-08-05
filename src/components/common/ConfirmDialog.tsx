import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export interface ConfirmConfig {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  config,
  onOpenChange,
  pending,
}: {
  config: ConfirmConfig | null;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
}) {
  return (
    <AlertDialog open={Boolean(config)} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-line bg-surface-1">
        <AlertDialogHeader>
          <AlertDialogTitle>{config?.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-ink-3">{config?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() => config?.onConfirm()}
            className={cn(
              config?.destructive &&
                'border border-danger/50 bg-danger-dim text-[oklch(0.88_0.10_28)] hover:bg-[oklch(0.36_0.13_22)]',
            )}
          >
            {pending ? 'Выполняем…' : config?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Хук-обёртка, чтобы не плодить состояние в каждой странице */
import { useCallback, useState } from 'react';

export function useConfirm() {
  const [config, setConfig] = useState<ConfirmConfig | null>(null);
  const ask = useCallback((c: ConfirmConfig) => setConfig(c), []);
  const close = useCallback(() => setConfig(null), []);
  return { config, ask, close };
}
