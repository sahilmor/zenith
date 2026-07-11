'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api/client';
import { resetPasswordFormSchema, type ResetPasswordFormValues } from '../schemas/auth-schemas';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: '' },
  });
  const mutation = useMutation({
    mutationKey: ['reset-password'],
    meta: {
      loadingTitle: 'Resetting password',
      successTitle: 'Password reset',
      successDescription: 'You can sign in now.',
      errorTitle: 'Unable to reset password',
    },
    mutationFn: (values: ResetPasswordFormValues) =>
      apiRequest<unknown>('/api/auth/reset-password', {
        method: 'POST',
        body: { token, password: values.password },
      }),
    onSuccess: () => router.replace('/login'),
  });

  if (!token) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
        This reset link is missing a token.{' '}
        <Link href="/forgot-password" className="font-medium underline">
          Request a new link
        </Link>
        .
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        error={form.formState.errors.password?.message}
        {...form.register('password')}
      />
      <Button className="w-full" size="lg" loading={mutation.isPending}>
        Reset password
      </Button>
    </form>
  );
}
