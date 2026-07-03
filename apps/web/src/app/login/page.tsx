import Link from 'next/link';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      description="Access your project management command center with a secure session."
      footer={
        <span>
          New here?{' '}
          <Link href="/signup" className="font-medium text-white hover:underline">
            Create an account
          </Link>
        </span>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
