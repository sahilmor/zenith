'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
}

export function Dropdown({ trigger, children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);
  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="min-w-0 max-w-full outline-none"
      >
        {trigger}
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-40 w-max min-w-56 max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-2 text-[var(--app-text)] shadow-2xl shadow-black/30">
          {children}
        </div>
      ) : null}
    </div>
  );
}
