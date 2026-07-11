'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { apiMutation } from '@/lib/api/client';
import type { AuthPayload } from '@/lib/api/types';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginFormSchema, type LoginFormValues } from '../schemas/auth-schemas';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });
  const mutation = useMutation({
    mutationKey: ['sign-in'],
    meta: {
      loadingTitle: 'Signing in',
      successTitle: 'Signed in',
      successDescription: 'Welcome back to your dashboard.',
      errorTitle: 'Unable to sign in',
    },
    mutationFn: (values: LoginFormValues) =>
      apiMutation<AuthPayload, LoginFormValues>('/api/auth/login', values),
    onSuccess: (payload) => {
      setSession(payload);
      router.replace(searchParams.get('next') ?? '/dashboard');
    },
  });
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={form.formState.errors.password?.message}
        {...form.register('password')}
      />
      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-slate-300 hover:text-white"
        >
          Forgot password?
        </Link>
      </div>
      <Button className="w-full" size="lg" loading={mutation.isPending}>
        Sign in
      </Button>
    </form>
  );
}
