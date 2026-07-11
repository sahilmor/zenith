'use client';

import Link from 'next/link';
import { ArrowLeft, KanbanSquare, Plus, Settings } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  useBoards,
  useColumns,
  useDeleteColumn,
  useUpdateColumn,
} from '@/features/boards/api/board-hooks';
import { BoardSelector } from '@/features/boards/components/board-selector';
import { CreateBoardDialog } from '@/features/boards/components/create-board-dialog';
import { CreateColumnDialog } from '@/features/boards/components/create-column-dialog';
import { useProject } from '@/features/projects/api/project-hooks';
import { usePresence, useRealtimeRoom, useRealtimeTasks } from '@/features/realtime/hooks';
import { useBoardTasks, useReorderTasks } from '@/features/tasks/api/task-hooks';
import { CreateTaskDialog } from '@/features/tasks/components/create-task-dialog';
import { KanbanBoard } from '@/features/tasks/components/kanban-board';
import { TaskDetailsDrawer } from '@/features/tasks/components/task-details-drawer';
import { toReorderColumnsInput } from '@/features/tasks/dnd/task-ordering';
import type { Task } from '@/features/tasks/types';
import { useBoardStore } from '@/stores/board-store';

export default function ProjectBoardsPage() {
  const params = useParams<{ projectId: string }>();
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [taskColumnId, setTaskColumnId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const selectedBoardIds = useBoardStore((state) => state.selectedBoardIds);
  const setSelectedBoardId = useBoardStore((state) => state.setSelectedBoardId);
  const project = useProject(params.projectId);
  const boards = useBoards(params.projectId);
  const activeBoards = useMemo(() => boards.data ?? [], [boards.data]);
  const selectedBoard =
    activeBoards.find((board) => board.id === selectedBoardIds[params.projectId]) ??
    activeBoards[0];
  const columns = useColumns(selectedBoard?.id);
  const updateColumn = useUpdateColumn(selectedBoard?.id);
  const deleteColumn = useDeleteColumn(selectedBoard?.id);
  const activeColumns = useMemo(
    () => (columns.data ?? []).filter((column) => !column.archived),
    [columns.data],
  );
  const boardTasks = useBoardTasks(
    activeColumns.map((column) => column.id),
    selectedBoard?.id,
  );
  const reorderTasks = useReorderTasks();
  useRealtimeRoom('project', params.projectId);
  useRealtimeTasks(selectedBoard?.id);
  const boardPresence = usePresence('board', selectedBoard?.id);

  useEffect(() => {
    if (selectedBoard && selectedBoard.id !== selectedBoardIds[params.projectId]) {
      setSelectedBoardId(params.projectId, selectedBoard.id);
    }
  }, [params.projectId, selectedBoard, selectedBoardIds, setSelectedBoardId]);

  const renameColumn = (columnId: string, name: string) => {
    updateColumn.mutate({ columnId, input: { name } });
  };

  const persistTaskOrder = (tasksByColumn: Record<string, Task[]>) => {
    if (!selectedBoard) return;
    reorderTasks.mutate({
      boardId: selectedBoard.id,
      columns: toReorderColumnsInput(tasksByColumn),
    });
  };

  const archiveColumn = (columnId: string) => {
    deleteColumn.mutate(columnId);
  };

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/projects/${params.projectId}`}>
            <ArrowLeft className="size-4" />
            Project
          </Link>
        </Button>
        <PageHeader
          eyebrow={project.data?.key ?? 'Project'}
          title="Boards"
          description="Plan work across fixed workflow columns and draggable task cards."
          actions={
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => setColumnDialogOpen(true)}
                disabled={!selectedBoard}
              >
                <Plus className="size-4" />
                Column
              </Button>
              <Button onClick={() => setBoardDialogOpen(true)}>
                <Plus className="size-4" />
                Board
              </Button>
            </div>
          }
        />
        {boards.isLoading ? (
          <Card className="rounded-lg p-5">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="mt-5 h-40 w-full" />
          </Card>
        ) : boards.isError ? (
          <ErrorState title="Unable to load boards" description="Please refresh and try again." />
        ) : activeBoards.length === 0 ? (
          <EmptyState
            icon={<KanbanSquare className="mx-auto size-8 text-emerald-300" />}
            title="No boards yet"
            description="Create the first Kanban board for this project."
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <BoardSelector
                boards={activeBoards}
                selectedBoardId={selectedBoard?.id ?? null}
                onSelect={(boardId) => setSelectedBoardId(params.projectId, boardId)}
              />
              <div className="flex items-center gap-3">
                {boardPresence && boardPresence.users.length > 0 ? (
                  <span className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-400">
                    {boardPresence.users.length} online
                  </span>
                ) : null}
                {selectedBoard ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/boards/${selectedBoard.id}/settings`}>
                      <Settings className="size-4" />
                      Settings
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
            {columns.isLoading ? (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                  <Card key={item} className="rounded-lg p-4">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="mt-5 h-24 w-full" />
                  </Card>
                ))}
              </section>
            ) : columns.isError ? (
              <ErrorState
                title="Unable to load columns"
                description="Please refresh and try again."
              />
            ) : boardTasks.isLoading ? (
              <section className="flex gap-4 overflow-x-auto pb-4">
                {[0, 1, 2, 3].map((item) => (
                  <Card key={item} className="min-h-[28rem] min-w-72 rounded-lg p-4">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="mt-5 h-24 w-full" />
                    <Skeleton className="mt-3 h-24 w-full" />
                  </Card>
                ))}
              </section>
            ) : boardTasks.isError ? (
              <ErrorState
                title="Unable to load tasks"
                description="Please refresh and try again."
              />
            ) : activeColumns.length === 0 ? (
              <EmptyState
                icon={<KanbanSquare className="mx-auto size-8 text-emerald-300" />}
                title="No active columns"
                description="Create a column to start adding tasks."
              />
            ) : selectedBoard ? (
              <KanbanBoard
                boardId={selectedBoard.id}
                columns={activeColumns}
                tasks={boardTasks.data}
                disabled={selectedBoard.archived}
                onCreateTask={setTaskColumnId}
                onOpenTask={setSelectedTask}
                onRenameColumn={renameColumn}
                onArchiveColumn={archiveColumn}
                onReorder={persistTaskOrder}
              />
            ) : (
              <ErrorState
                title="Unable to select board"
                description="Please refresh and try again."
              />
            )}
          </>
        )}
      </div>
      <CreateBoardDialog
        open={boardDialogOpen}
        projectId={params.projectId}
        onClose={() => setBoardDialogOpen(false)}
      />
      <CreateColumnDialog
        open={columnDialogOpen}
        boardId={selectedBoard?.id ?? null}
        onClose={() => setColumnDialogOpen(false)}
      />
      <CreateTaskDialog
        open={Boolean(taskColumnId)}
        columnId={taskColumnId}
        onClose={() => setTaskColumnId(null)}
      />
      <TaskDetailsDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
    </main>
  );
}
