import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-sm border border-line-soft bg-surface-1 px-[13px] py-[11px]',
        'text-[0.9375rem] font-light transition-colors duration-150 ease-out-quart',
        'placeholder:text-[oklch(0.48_0.012_322)]',
        'hover:border-line focus:border-ember focus:bg-surface-2 focus:outline-none focus-visible:ring-0',
        'aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
