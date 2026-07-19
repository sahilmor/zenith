import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <label className="block min-w-0 space-y-2" htmlFor={inputId}>
        {label ? <span className="text-sm font-medium text-[var(--app-text)]">{label}</span> : null}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'h-11 w-full min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] px-3 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-subtle)] focus:border-[var(--app-accent)] focus:ring-2 focus:ring-[var(--app-glow)]',
            error && 'border-[var(--app-danger)] focus:border-[var(--app-danger)]',
            className,
          )}
          {...props}
        />
        {error ? <span className="text-xs text-[var(--app-danger)]">{error}</span> : null}
      </label>
    );
  },
);
Input.displayName = 'Input';
