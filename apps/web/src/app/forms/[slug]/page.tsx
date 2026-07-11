'use client';

import { useParams } from 'next/navigation';
import { type FormEvent } from 'react';
import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  usePublicForm,
  useSubmitPublicForm,
} from '@/features/customization/api/customization-hooks';

export default function PublicFormPage() {
  const params = useParams<{ slug: string }>();
  const form = usePublicForm(params.slug);
  const submitForm = useSubmitPublicForm(params.slug);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = Object.fromEntries(data.entries());
    submitForm.mutate(values, {
      onSuccess: () => event.currentTarget.reset(),
    });
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-10 text-[var(--app-text)]">
      <div className="mx-auto max-w-2xl">
        {form.isLoading ? (
          <Skeleton className="h-96 w-full rounded-lg" />
        ) : form.isError || !form.data ? (
          <ErrorState
            title="Form unavailable"
            description="This form is not accepting submissions."
          />
        ) : (
          <Card className="rounded-lg p-6">
            <h1 className="text-2xl font-semibold text-white">{form.data.name}</h1>
            {form.data.description ? (
              <p className="mt-2 text-sm leading-6 text-slate-400">{form.data.description}</p>
            ) : null}
            <form className="mt-6 space-y-4" onSubmit={submit}>
              {form.data.fields.map((field) => (
                <PublicFormField key={field.id} field={field} />
              ))}
              <Button className="w-full" loading={submitForm.isPending}>
                Submit
              </Button>
              {submitForm.data ? (
                <p className="text-sm text-emerald-300">{submitForm.data.confirmationMessage}</p>
              ) : null}
            </form>
          </Card>
        )}
      </div>
    </main>
  );
}

function PublicFormField({
  field,
}: {
  readonly field: NonNullable<ReturnType<typeof usePublicForm>['data']>['fields'][number];
}) {
  if (field.fieldType === 'description' || field.fieldType === 'long_text') {
    return (
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-200">{field.label}</span>
        <textarea
          name={field.id}
          required={field.required}
          className="min-h-28 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none"
        />
      </label>
    );
  }
  return (
    <Input
      name={field.id}
      label={field.label}
      type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
      required={field.required}
    />
  );
}
