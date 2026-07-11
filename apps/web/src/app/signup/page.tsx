import Link from 'next/link';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { SignupForm } from '@/features/auth/components/signup-form';

export default function SignupPage() {
  return (
    <AuthShell
      title="Create account"
      description="Create your account, verify your email, and start managing workspace projects."
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
