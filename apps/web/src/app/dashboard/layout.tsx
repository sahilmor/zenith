import type { ReactNode } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { AiCopilotSidebar } from '@/features/ai/components/ai-copilot-sidebar';

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="app-surface h-screen overflow-hidden">
      <div className="flex h-full min-w-0">
        <Sidebar />
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <Navbar />
          <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </div>
        </div>
      </div>
      <AiCopilotSidebar />
    </div>
  );
}
