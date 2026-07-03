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
      <label className="block space-y-2" htmlFor={inputId}>
        {label ? <span className="text-sm font-medium text-slate-200">{label}</span> : null}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/30 focus:ring-2 focus:ring-white/10',
            error && 'border-red-400/70 focus:border-red-400',
            className,
          )}
          {...props}
        />
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </label>
    );
  },
);
Input.displayName = 'Input';
