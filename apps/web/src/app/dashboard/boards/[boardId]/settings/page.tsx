'use client';

import Link from 'next/link';
import { Archive, ArrowLeft, RotateCcw, Save } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useArchiveBoard,
  useBoard,
  useRestoreBoard,
  useUpdateBoard,
} from '@/features/boards/api/board-hooks';

export default function BoardSettingsPage() {
  const params = useParams<{ boardId: string }>();
  const board = useBoard(params.boardId);
  const updateBoard = useUpdateBoard(params.boardId);
  const archiveBoard = useArchiveBoard();
  const restoreBoard = useRestoreBoard();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (!board.data) return;
    setName(board.data.name);
    setDescription(board.data.description ?? '');
    setIsDefault(board.data.isDefault);
  }, [board.data]);

  const save = () => {
    updateBoard.mutate({ name, description: description.trim() ? description : null, isDefault });
  };

  const archive = () => {
    if (!board.data) return;
    archiveBoard.mutate(board.data);
  };

  const restore = () => {
    if (!board.data) return;
    restoreBoard.mutate(board.data);
  };

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link
            href={
              board.data
                ? `/dashboard/projects/${board.data.projectId}/boards`
                : '/dashboard/projects'
            }
          >
            <ArrowLeft className="size-4" />
            Boards
          </Link>
        </Button>
        <PageHeader
          eyebrow="Board"
          title="Settings"
          description="Manage board identity and lifecycle."
          actions={
            <Button
              onClick={save}
              loading={updateBoard.isPending}
              disabled={!board.data || board.data.archived || name.trim().length < 2}
            >
              <Save className="size-4" />
              Save
            </Button>
          }
        />
        {board.isLoading ? (
          <Card className="rounded-lg p-6">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="mt-5 h-24 w-full" />
          </Card>
        ) : board.isError ? (
          <ErrorState title="Unable to load board" description="Please refresh and try again." />
        ) : board.data ? (
          <div className="grid gap-6">
            <Card className="rounded-lg p-6">
              <div className="grid gap-4">
                <Input
                  label="Name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Description</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-28 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                  />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm">
                  Default board
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(event) => setIsDefault(event.target.checked)}
                    className="size-4 accent-emerald-400"
                  />
                </label>
              </div>
            </Card>
            <Card className="rounded-lg border-red-400/20 p-6">
              <h2 className="font-semibold text-red-200">Board lifecycle</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Archived boards stay visible for reference and can be restored later.
              </p>
              {board.data.archived ? (
                <Button
                  className="mt-4"
                  variant="secondary"
                  loading={restoreBoard.isPending}
                  onClick={restore}
                >
                  <RotateCcw className="size-4" />
                  Restore
                </Button>
              ) : (
                <Button
                  className="mt-4"
                  variant="destructive"
                  loading={archiveBoard.isPending}
                  onClick={archive}
                >
                  <Archive className="size-4" />
                  Archive
                </Button>
              )}
            </Card>
          </div>
        ) : null}
      </div>
    </main>
  );
}
