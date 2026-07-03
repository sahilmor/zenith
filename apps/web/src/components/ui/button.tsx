import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  asChild?: boolean;
  loading?: boolean;
}

const variants = {
  primary: 'bg-white text-slate-950 hover:bg-slate-200 shadow-lg shadow-white/10',
  secondary: 'border border-white/10 bg-white/5 text-white hover:bg-white/10',
  ghost: 'text-slate-300 hover:bg-white/10 hover:text-white',
  destructive: 'bg-red-500 text-white hover:bg-red-400',
};

const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-5', icon: 'size-10' };

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  asChild,
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {children}
        </>
      )}
    </Component>
  );
}

export type { ButtonProps };
