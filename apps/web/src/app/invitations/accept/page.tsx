'use client';

import Link from 'next/link';
import { CheckCircle2, LogIn } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { ErrorState } from '@/components/common/error-state';
import { Loader } from '@/components/common/loader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAcceptInvitation } from '@/features/workspaces/api/workspace-hooks';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const accessToken = useAuthStore((state) => state.accessToken);
  const hydrated = useAuthStore((state) => state.hydrated);
  const setCurrentWorkspaceId = useWorkspaceStore((state) => state.setCurrentWorkspaceId);
  const acceptInvitation = useAcceptInvitation();

  useEffect(() => {
    if (
      !hydrated ||
      !accessToken ||
      !token ||
      acceptInvitation.isPending ||
      acceptInvitation.isSuccess
    )
      return;
    acceptInvitation.mutate(token, {
      onSuccess: (workspace) => setCurrentWorkspaceId(workspace.id),
    });
  }, [acceptInvitation, accessToken, hydrated, setCurrentWorkspaceId, token]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
      <Card className="w-full max-w-md rounded-lg p-6 text-center">
        {!token ? (
          <ErrorState
            title="Invitation link is invalid"
            description="Ask your workspace admin for a new invitation."
          />
        ) : !hydrated ? (
          <div className="grid place-items-center py-8">
            <Loader />
          </div>
        ) : !accessToken ? (
          <>
            <LogIn className="mx-auto size-10 text-emerald-300" />
            <h1 className="mt-4 text-xl font-semibold">Sign in to accept</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Use the email address that received this invitation.
            </p>
            <Button asChild className="mt-5">
              <Link href={`/login?next=/invitations/accept?token=${token}`}>Sign in</Link>
            </Button>
          </>
        ) : acceptInvitation.isError ? (
          <ErrorState
            title="Could not accept invitation"
            description={
              acceptInvitation.error instanceof Error
                ? acceptInvitation.error.message
                : 'Please ask for a new invitation.'
            }
          />
        ) : acceptInvitation.isSuccess ? (
          <>
            <CheckCircle2 className="mx-auto size-10 text-emerald-300" />
            <h1 className="mt-4 text-xl font-semibold">Invitation accepted</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Your workspace is ready.</p>
            <Button asChild className="mt-5">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          </>
        ) : (
          <div className="grid place-items-center py-8">
            <Loader />
          </div>
        )}
      </Card>
    </main>
  );
}
