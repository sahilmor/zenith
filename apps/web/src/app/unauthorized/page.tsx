import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-center text-white">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-300">
          Unauthorized
        </p>
        <h1 className="mt-4 text-4xl font-semibold">Access restricted</h1>
        <p className="mt-3 max-w-md text-slate-400">
          Sign in with an authorized account to continue.
        </p>
        <Button asChild className="mt-8">
          <Link href="/login">Go to login</Link>
        </Button>
      </div>
    </main>
  );
}
