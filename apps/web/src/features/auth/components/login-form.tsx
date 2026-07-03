'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { apiMutation } from '@/lib/api/client';
import type { AuthPayload } from '@/lib/api/types';
import { useToast } from '@/providers/toast-provider';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginFormSchema, type LoginFormValues } from '../schemas/auth-schemas';

export function LoginForm() {
  const router = useRouter();
  const { notify } = useToast();
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: LoginFormValues) =>
      apiMutation<AuthPayload, LoginFormValues>('/api/auth/login', values),
    onSuccess: (payload) => {
      setSession(payload);
      notify({
        title: 'Signed in',
        description: 'Welcome back to your dashboard.',
        variant: 'success',
      });
      router.replace('/dashboard');
    },
    onError: (error) =>
      notify({
        title: 'Unable to sign in',
        description: error instanceof Error ? error.message : 'Please check your credentials.',
        variant: 'error',
      }),
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
      <Button className="w-full" size="lg" loading={mutation.isPending}>
        Sign in
      </Button>
    </form>
  );
}
