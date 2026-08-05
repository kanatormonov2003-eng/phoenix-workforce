import { cn } from '@/lib/utils';

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn('panel', className)}>{children}</section>;
}

export function PanelHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="panel-head">
      <h4 className="text-[0.9375rem] font-semibold">{title}</h4>
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function PanelBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
