'use client';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common/error-state';

export default function GlobalError({
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6">
      <div className="w-full max-w-lg">
        <ErrorState
          title="Application error"
          description="The frontend shell hit an unexpected error."
        />
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
