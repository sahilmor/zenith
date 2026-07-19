'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './button';

interface DialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Dialog({ open, title, children, onClose }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <section className="w-full max-w-lg rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-6 text-[var(--app-text)] shadow-2xl shadow-black/30">
        <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
          <h2 className="min-w-0 break-words text-lg font-semibold">{title}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}

export const Modal = Dialog;
