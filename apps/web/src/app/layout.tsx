import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AppProviders } from '@/providers/app-providers';

export const metadata: Metadata = {
  title: 'Project Management',
  description: 'Production-ready project management workspace platform.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-950 antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
