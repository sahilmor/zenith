import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthShell({
  title,
  description,
  children,
  footer,
}: Readonly<{ title: string; description: string; children: ReactNode; footer: ReactNode }>) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_30%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 px-6 py-8 lg:grid-cols-[1fr_460px] lg:gap-16">
        <section className="hidden flex-col justify-between py-8 lg:flex">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Zenith
          </Link>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-300">
              Project command center
            </p>
            <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-white">
              Plan work with the calm precision of a modern product team.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
              A clean foundation for teams, projects, boards, and delivery workflows. Authentication
              is ready now; product modules arrive in future phases.
            </p>
          </div>
          <p className="text-sm text-slate-500">Inspired by Linear, Notion, Jira, and Vercel.</p>
        </section>
        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8">
            <div className="mb-8">
              <p className="text-sm text-slate-400">Welcome to Zenith</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
            </div>
            {children}
            <div className="mt-6 text-center text-sm text-slate-400">{footer}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
