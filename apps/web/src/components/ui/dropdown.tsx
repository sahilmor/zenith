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
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="outline-none">
        {trigger}
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-40 min-w-56 rounded-2xl border border-white/10 bg-slate-950 p-2 shadow-2xl shadow-black/40">
          {children}
        </div>
      ) : null}
    </div>
  );
}
