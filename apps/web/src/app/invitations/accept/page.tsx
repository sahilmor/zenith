'use client';

import Link from 'next/link';
import { CheckCircle2, LogIn } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { ErrorState } from '@/components/common/error-state';
import { Loader } from '@/components/common/loader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  useAcceptInvitation,
  useInvitationPreview,
} from '@/features/workspaces/api/workspace-hooks';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkspaceStore } from '@/stores/workspace-store';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setCurrentWorkspaceId = useWorkspaceStore((state) => state.setCurrentWorkspaceId);
  const invitationPreview = useInvitationPreview(token, hydrated && Boolean(accessToken));
  const acceptInvitation = useAcceptInvitation();
  const signedInEmail = user?.email ?? '';
  const invitedEmail = invitationPreview.data?.email ?? '';
  const isSignedInAsInvitedUser =
    Boolean(signedInEmail) &&
    Boolean(invitedEmail) &&
    normalizeEmail(signedInEmail) === normalizeEmail(invitedEmail);

  useEffect(() => {
    if (
      !hydrated ||
      !accessToken ||
      !token ||
      !invitationPreview.data ||
      !isSignedInAsInvitedUser ||
      acceptInvitation.isPending ||
      acceptInvitation.isSuccess
    )
      return;
    acceptInvitation.mutate(token, {
      onSuccess: (workspace) => setCurrentWorkspaceId(workspace.id),
    });
  }, [
    acceptInvitation,
    accessToken,
    hydrated,
    invitationPreview.data,
    isSignedInAsInvitedUser,
    setCurrentWorkspaceId,
    token,
  ]);

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
        ) : invitationPreview.isPending ? (
          <div className="grid place-items-center py-8">
            <Loader />
          </div>
        ) : invitationPreview.isError ? (
          <ErrorState
            title="Invitation link is not available"
            description={
              invitationPreview.error instanceof Error
                ? invitationPreview.error.message
                : 'Ask your workspace admin for a new invitation.'
            }
          />
        ) : invitationPreview.data && !isSignedInAsInvitedUser ? (
          <div className="text-left">
            <LogIn className="mx-auto size-10 text-amber-300" />
            <h1 className="mt-4 text-center text-xl font-semibold">Switch account to accept</h1>
            <p className="mt-3 text-center text-sm leading-6 text-slate-400">
              This invitation is for{' '}
              <span className="font-medium text-white">{invitationPreview.data.email}</span>, but
              you are signed in as <span className="font-medium text-white">{signedInEmail}</span>.
            </p>
            <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Sign out, then sign in or create an account using the invited email address.
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                className="flex-1"
                onClick={() => {
                  clearSession();
                }}
              >
                Sign out
              </Button>
              <Button asChild className="flex-1" variant="secondary">
                <Link href={`/login?next=/invitations/accept?token=${token}`}>Sign in</Link>
              </Button>
            </div>
          </div>
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
