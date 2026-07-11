'use client';

import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader } from '@/components/common/loader';
import { apiRequest } from '@/lib/api/client';
import type { AuthPayload } from '@/lib/api/types';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation } from '@tanstack/react-query';

export default function VerifyEmailPage() {
  const token = useSearchParams().get('token');
  const setSession = useAuthStore((state) => state.setSession);
  const verify = useMutation({
    mutationFn: () =>
      apiRequest<AuthPayload>('/api/auth/verify-email', { method: 'POST', body: { token } }),
    onSuccess: setSession,
  });

  useEffect(() => {
    if (token && !verify.isPending && !verify.isSuccess && !verify.isError) verify.mutate();
  }, [token, verify]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
      <Card className="w-full max-w-md rounded-lg p-6 text-center">
        {!token ? (
          <>
            <XCircle className="mx-auto size-10 text-red-300" />
            <h1 className="mt-4 text-xl font-semibold">Invalid verification link</h1>
          </>
        ) : verify.isPending || verify.isIdle ? (
          <div className="grid place-items-center py-8">
            <Loader />
          </div>
        ) : verify.isError ? (
          <>
            <XCircle className="mx-auto size-10 text-red-300" />
            <h1 className="mt-4 text-xl font-semibold">Verification failed</h1>
            <p className="mt-2 text-sm text-slate-400">
              This link may have expired. Request a new verification email from the sign-in page.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="mx-auto size-10 text-emerald-300" />
            <h1 className="mt-4 text-xl font-semibold">Email verified</h1>
            <p className="mt-2 text-sm text-slate-400">Your account is ready.</p>
          </>
        )}
        <Button asChild className="mt-6">
          <Link href="/dashboard">Continue</Link>
        </Button>
      </Card>
    </main>
  );
}
