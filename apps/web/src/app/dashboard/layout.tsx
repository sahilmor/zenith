import type { ReactNode } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Navbar />
          {children}
        </div>
      </div>
    </div>
  );
}
