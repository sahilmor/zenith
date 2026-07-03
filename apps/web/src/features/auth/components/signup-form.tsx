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
import { signupFormSchema, type SignupFormValues } from '../schemas/auth-schemas';

export function SignupForm() {
  const router = useRouter();
  const { notify } = useToast();
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: SignupFormValues) =>
      apiMutation<AuthPayload, SignupFormValues>('/api/auth/signup', values),
    onSuccess: (payload) => {
      setSession(payload);
      notify({
        title: 'Account created',
        description: 'Your workspace foundation is ready.',
        variant: 'success',
      });
      router.replace('/dashboard');
    },
    onError: (error) =>
      notify({
        title: 'Unable to create account',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      }),
  });
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <Input
        label="Name"
        autoComplete="name"
        error={form.formState.errors.name?.message}
        {...form.register('name')}
      />
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
        autoComplete="new-password"
        error={form.formState.errors.password?.message}
        {...form.register('password')}
      />
      <Button className="w-full" size="lg" loading={mutation.isPending}>
        Create account
      </Button>
    </form>
  );
}
