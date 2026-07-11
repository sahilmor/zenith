'use client';

import { CheckCircle2, Info, Loader2, X, XCircle, AlertTriangle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import {
  toastManager,
  type ToastInput,
  type ToastItem,
  type ToastVariant,
} from '@/lib/feedback/toast-manager';

interface ToastContextValue {
  notify: (toast: ToastInput) => string;
  update: (id: string, toast: Omit<ToastInput, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  loading: 'border-sky-300/30 bg-sky-500/10',
  success: 'border-emerald-300/30 bg-emerald-500/10',
  error: 'border-red-300/30 bg-red-500/10',
  warning: 'border-amber-300/30 bg-amber-500/10',
  info: 'border-white/10 bg-slate-950/95',
  progress: 'border-sky-300/30 bg-sky-500/10',
};

const iconFor = (variant: ToastVariant) => {
  if (variant === 'loading' || variant === 'progress')
    return <Loader2 className="mt-0.5 size-4 animate-spin text-sky-200" />;
  if (variant === 'success') return <CheckCircle2 className="mt-0.5 size-4 text-emerald-200" />;
  if (variant === 'error') return <XCircle className="mt-0.5 size-4 text-red-200" />;
  if (variant === 'warning') return <AlertTriangle className="mt-0.5 size-4 text-amber-200" />;
  return <Info className="mt-0.5 size-4 text-slate-300" />;
};

export function ToastProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => toastManager.subscribe(setToasts), []);

  const notify = useCallback((toast: ToastInput) => toastManager.show(toast), []);
  const update = useCallback(
    (id: string, toast: Omit<ToastInput, 'id'>) => toastManager.update(id, toast),
    [],
  );
  const dismiss = useCallback((id: string) => toastManager.dismiss(id), []);
  const value = useMemo(() => ({ notify, update, dismiss }), [dismiss, notify, update]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3"
        role="status"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: Readonly<{ toast: ToastItem; onDismiss: () => void }>) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 text-sm text-white shadow-2xl shadow-black/30 backdrop-blur motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2',
        variantStyles[toast.variant],
      )}
    >
      <div className="flex gap-3">
        {iconFor(toast.variant)}
        <div className="min-w-0 flex-1">
          <div className="font-medium">{toast.title}</div>
          {toast.description ? (
            <div className="mt-1 text-slate-300">{toast.description}</div>
          ) : null}
          {toast.progress !== undefined ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <div
                className="h-full rounded-full bg-sky-300 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, toast.progress))}%` }}
              />
            </div>
          ) : null}
          {(toast.action || toast.undo) && (
            <div className="mt-3 flex gap-2">
              {toast.action ? (
                <button
                  type="button"
                  className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/15"
                  onClick={toast.action.onClick}
                >
                  {toast.action.label}
                </button>
              ) : null}
              {toast.undo ? (
                <button
                  type="button"
                  className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/15"
                  onClick={toast.undo.onClick}
                >
                  {toast.undo.label}
                </button>
              ) : null}
            </div>
          )}
        </div>
        <button
          type="button"
          className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
};
