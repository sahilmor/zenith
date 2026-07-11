'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCheckIns, useGoal, useKeyResults } from '@/features/strategic/api/strategic-hooks';
import { GoalDetailsPanel } from '@/features/strategic/components/strategic-panels';

export default function GoalDetailsPage() {
  const params = useParams<{ goalId: string }>();
  const goal = useGoal(params.goalId);
  const keyResults = useKeyResults(params.goalId);
  const checkIns = useCheckIns(params.goalId);

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/goals">
            <ArrowLeft className="size-4" />
            Goals
          </Link>
        </Button>
        {goal.isLoading ? (
          <Card className="rounded-lg p-6">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-6 h-2 w-full rounded-full" />
          </Card>
        ) : goal.isError ? (
          <ErrorState title="Unable to load goal" description="Please refresh and try again." />
        ) : goal.data ? (
          <>
            <PageHeader
              eyebrow="Goal"
              title={goal.data.title}
              description="Manage key results, health updates, confidence, and strategic status."
            />
            <GoalDetailsPanel goal={goal.data} keyResults={keyResults} checkIns={checkIns} />
          </>
        ) : null}
      </div>
    </main>
  );
}
