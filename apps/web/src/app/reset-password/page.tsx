import Link from 'next/link';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      description="Use a strong password with uppercase, lowercase, and a number."
      footer={
        <Link href="/login" className="font-medium text-white hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
