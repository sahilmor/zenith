'use client';

export type ToastVariant = 'loading' | 'success' | 'error' | 'warning' | 'info' | 'progress';

export interface ToastAction {
  readonly label: string;
  readonly onClick: () => void;
}

export interface ToastItem {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly variant: ToastVariant;
  readonly progress?: number;
  readonly persistent?: boolean;
  readonly action?: ToastAction;
  readonly undo?: ToastAction;
  readonly createdAt: number;
}

export interface ToastInput {
  readonly id?: string;
  readonly title: string;
  readonly description?: string;
  readonly variant?: ToastVariant;
  readonly progress?: number;
  readonly persistent?: boolean;
  readonly action?: ToastAction;
  readonly undo?: ToastAction;
  readonly durationMs?: number;
}

type Listener = (toasts: ToastItem[]) => void;

const maxVisibleToasts = 5;
const defaultDurationMs = 5000;

const createToastId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export class ToastManager {
  private readonly listeners = new Set<Listener>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private toasts: ToastItem[] = [];

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.visibleToasts());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public show(input: ToastInput): string {
    const id = input.id ?? createToastId();
    this.clearTimer(id);
    const toast: ToastItem = {
      id,
      title: input.title,
      ...(input.description ? { description: input.description } : {}),
      variant: input.variant ?? 'info',
      ...(input.progress !== undefined ? { progress: input.progress } : {}),
      ...(input.persistent ? { persistent: input.persistent } : {}),
      ...(input.action ? { action: input.action } : {}),
      ...(input.undo ? { undo: input.undo } : {}),
      createdAt: Date.now(),
    };
    this.toasts = [toast, ...this.toasts.filter((item) => item.id !== id)];
    this.scheduleDismiss(toast, input.durationMs);
    this.emit();
    return id;
  }

  public update(id: string, input: Omit<ToastInput, 'id'>): void {
    const current = this.toasts.find((toast) => toast.id === id);
    if (!current) {
      this.show({ ...input, id });
      return;
    }
    this.clearTimer(id);
    const updated: ToastItem = {
      id: current.id,
      createdAt: current.createdAt,
      title: input.title,
      variant: input.variant ?? current.variant,
      ...(input.description ? { description: input.description } : {}),
      ...(input.progress !== undefined ? { progress: input.progress } : {}),
      ...(input.persistent === true ? { persistent: true } : {}),
      ...(input.action ? { action: input.action } : {}),
      ...(input.undo ? { undo: input.undo } : {}),
    };
    this.toasts = this.toasts.map((toast) => (toast.id === id ? updated : toast));
    this.scheduleDismiss(updated, input.durationMs);
    this.emit();
  }

  public dismiss(id: string): void {
    this.clearTimer(id);
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
    this.emit();
  }

  public clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.toasts = [];
    this.emit();
  }

  public snapshot(): ToastItem[] {
    return this.visibleToasts();
  }

  private visibleToasts(): ToastItem[] {
    return this.toasts.slice(0, maxVisibleToasts);
  }

  private scheduleDismiss(toast: ToastItem, durationMs?: number): void {
    if (toast.persistent || toast.variant === 'loading' || toast.variant === 'progress') return;
    const timer = setTimeout(() => this.dismiss(toast.id), durationMs ?? defaultDurationMs);
    this.timers.set(toast.id, timer);
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (!timer) return;
    clearTimeout(timer);
    this.timers.delete(id);
  }

  private emit(): void {
    const snapshot = this.visibleToasts();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export const toastManager = new ToastManager();

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error && error.message.trim()
    ? error.message
    : 'The request could not be completed.';

export const createUploadFeedback = (fileName: string) => {
  const id = toastManager.show({
    title: 'Uploading attachment',
    description: fileName,
    variant: 'progress',
    progress: 0,
    persistent: true,
  });
  return {
    progress: (value: number) =>
      toastManager.update(id, {
        title: 'Uploading attachment',
        description: `${fileName} - ${Math.round(value)}%`,
        variant: 'progress',
        progress: value,
        persistent: true,
      }),
    success: () =>
      toastManager.update(id, {
        title: 'Attachment uploaded',
        description: fileName,
        variant: 'success',
        progress: 100,
      }),
    error: (error: unknown) =>
      toastManager.update(id, {
        title: 'Upload failed',
        description: getErrorMessage(error),
        variant: 'error',
      }),
  };
};
