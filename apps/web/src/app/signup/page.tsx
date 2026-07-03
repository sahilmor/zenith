import Link from 'next/link';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { SignupForm } from '@/features/auth/components/signup-form';

export default function SignupPage() {
  return (
    <AuthShell
      title="Create account"
      description="Start with authentication now. Team workspaces and project modules arrive in upcoming phases."
      footer={
        <span>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-white hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
