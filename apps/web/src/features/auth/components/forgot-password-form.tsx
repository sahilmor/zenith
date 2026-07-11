'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api/client';
import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from '../schemas/auth-schemas';

export function ForgotPasswordForm() {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: '' },
  });
  const mutation = useMutation({
    mutationKey: ['forgot-password'],
    meta: {
      loadingTitle: 'Sending reset link',
      successTitle: 'Check your email',
      successDescription: 'If an account exists, a reset link has been sent.',
      errorTitle: 'Unable to request reset',
    },
    mutationFn: (values: ForgotPasswordFormValues) =>
      apiRequest<unknown>('/api/auth/forgot-password', { method: 'POST', body: values }),
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
      <Button className="w-full" size="lg" loading={mutation.isPending}>
        Send reset link
      </Button>
    </form>
  );
}
