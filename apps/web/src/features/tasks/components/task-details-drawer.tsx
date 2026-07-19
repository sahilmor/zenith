'use client';

import {
  Archive,
  Check,
  Eye,
  FileUp,
  MessageSquare,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRealtimeComments, useTyping } from '@/features/realtime/hooks';
import {
  useActivity,
  useAttachments,
  useComments,
  useCreateComment,
  useCreateReply,
  useDeleteAttachment,
  useDeleteComment,
  useLabels,
  useUploadAttachment,
  useUpdateComment,
  useWatchTask,
} from '../api/task-collaboration-hooks';
import {
  useCreateSubtask,
  useDeleteSubtask,
  useDeleteTask,
  useSubtasks,
  useUpdateSubtask,
  useUpdateTask,
} from '../api/task-hooks';
import type { Task, TaskComment, TaskPriority } from '../types';

interface TaskDetailsDrawerProps {
  task: Task | null;
  onClose: () => void;
}

export function TaskDetailsDrawer({ task, onClose }: TaskDetailsDrawerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [comment, setComment] = useState('');
  const [replyByCommentId, setReplyByCommentId] = useState<Record<string, string>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState('#64748b');
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const subtasks = useSubtasks(task?.id, Boolean(task));
  const createSubtask = useCreateSubtask(task?.id);
  const updateSubtask = useUpdateSubtask(task?.id);
  const deleteSubtask = useDeleteSubtask(task?.id);
  const comments = useComments(task?.id, Boolean(task));
  const createComment = useCreateComment(task?.id);
  const createReply = useCreateReply(task?.id);
  const updateComment = useUpdateComment(task?.id);
  const deleteComment = useDeleteComment(task?.id);
  const attachments = useAttachments(task?.id, Boolean(task));
  const uploadAttachment = useUploadAttachment(task?.id);
  const deleteAttachment = useDeleteAttachment(task?.id);
  const activity = useActivity(task?.id, Boolean(task));
  const labels = useLabels(task?.id, Boolean(task));
  const watchTask = useWatchTask(task?.id);
  useRealtimeComments(task?.id);
  const typing = useTyping(task?.id);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setEditingCommentId(null);
    setEditingCommentContent('');
  }, [task]);

  useEffect(() => {
    if (!task) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, task]);

  if (!task) return null;

  const save = () => {
    updateTask.mutate({
      taskId: task.id,
      input: { title, description: description.trim() ? description : null, priority },
    });
  };

  const archive = () => {
    deleteTask.mutate(task, {
      onSuccess: onClose,
    });
  };

  const addSubtask = () => {
    createSubtask.mutate({ title: subtaskTitle }, { onSuccess: () => setSubtaskTitle('') });
  };

  const addComment = () => {
    createComment.mutate({ content: comment }, { onSuccess: () => setComment('') });
  };

  const addReply = (commentId: string) => {
    const content = replyByCommentId[commentId]?.trim();
    if (!content) return;
    createReply.mutate(
      { commentId, input: { content } },
      {
        onSuccess: () =>
          setReplyByCommentId((current) => ({
            ...current,
            [commentId]: '',
          })),
      },
    );
  };

  const startEditingComment = (item: TaskComment) => {
    setEditingCommentId(item.id);
    setEditingCommentContent(item.content);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const saveComment = (commentId: string) => {
    const content = editingCommentContent.trim();
    if (!content) return;
    updateComment.mutate({ commentId, input: { content } }, { onSuccess: cancelEditingComment });
  };

  const removeComment = (commentId: string) => {
    deleteComment.mutate(commentId);
  };

  const uploadFile = (file: File | undefined) => {
    if (!file) return;
    uploadAttachment.mutate(file);
  };

  const addLabel = () => {
    labels.create.mutate(
      { name: labelName, color: labelColor },
      {
        onSuccess: () => {
          setLabelName('');
          setLabelColor('#64748b');
        },
      },
    );
  };

  const topLevelComments = (comments.data ?? []).filter((item) => !item.parentCommentId);
  const repliesByComment = new Map<string, TaskComment[]>(
    topLevelComments.map((item) => [
      item.id,
      (comments.data ?? []).filter((reply) => reply.parentCommentId === item.id),
    ]),
  );

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-details-title"
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl min-w-0 flex-col border-l border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)] shadow-2xl shadow-black/30"
    >
      <header className="flex min-w-0 items-center justify-between gap-3 border-b border-[var(--app-border)] px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-subtle)]">Task</p>
          <h2 id="task-details-title" className="mt-1 text-lg font-semibold">
            Details
          </h2>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close task">
          <X className="size-4" />
        </Button>
      </header>
      <div className="app-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--app-text)]">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-36 w-full resize-none rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] px-3 py-3 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-subtle)] focus:border-[var(--app-accent)] focus:ring-2 focus:ring-[var(--app-glow)]"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--app-text)]">Priority</span>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            className="h-11 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <section className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Subtasks</h3>
            <span className="text-xs text-[var(--app-subtle)]">{subtasks.data?.length ?? 0}</span>
          </div>
          <div className="mt-4 flex min-w-0 gap-2">
            <Input
              aria-label="Subtask title"
              placeholder="Add a subtask"
              value={subtaskTitle}
              onChange={(event) => setSubtaskTitle(event.target.value)}
            />
            <Button
              type="button"
              size="icon"
              disabled={subtaskTitle.trim().length < 2}
              loading={createSubtask.isPending}
              onClick={addSubtask}
              aria-label="Create subtask"
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {(subtasks.data ?? []).map((subtask) => (
              <div
                key={subtask.id}
                className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)]/65 px-3 py-2"
              >
                <button
                  type="button"
                  className="shrink-0 rounded-md p-1 text-[var(--app-muted)] hover:bg-[var(--app-panel-soft)] hover:text-[var(--app-text)]"
                  onClick={() =>
                    updateSubtask.mutate({
                      subtaskId: subtask.id,
                      input: { completed: !subtask.completed },
                    })
                  }
                  aria-label={subtask.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  <Check className={subtask.completed ? 'size-4 text-emerald-300' : 'size-4'} />
                </button>
                <span className="min-w-0 flex-1 break-words text-sm text-[var(--app-text)]">
                  {subtask.title}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => deleteSubtask.mutate(subtask.id)}
                  aria-label="Delete subtask"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
              <Tag className="size-4" />
              Labels
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => watchTask.watch.mutate()}
              loading={watchTask.watch.isPending}
            >
              <Eye className="size-4" />
              Watch
            </Button>
          </div>
          <div className="mt-3 flex min-w-0 flex-wrap gap-2">
            {(labels.labels.data ?? []).map((label) => (
              <button
                key={label.id}
                type="button"
                className="max-w-full truncate rounded-md px-2 py-1 text-xs font-medium text-white shadow-sm"
                style={{ backgroundColor: label.color }}
                onClick={() => labels.remove.mutate(label.id)}
              >
                {label.name}
              </button>
            ))}
          </div>
          <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_auto]">
            <Input
              aria-label="Label name"
              placeholder="Label"
              value={labelName}
              onChange={(event) => setLabelName(event.target.value)}
            />
            <Input
              aria-label="Label color"
              value={labelColor}
              onChange={(event) => setLabelColor(event.target.value)}
            />
            <Button
              type="button"
              size="icon"
              disabled={labelName.trim().length < 1}
              loading={labels.create.isPending}
              onClick={addLabel}
              aria-label="Add label"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </section>
        <section className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-4">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="size-4" />
            Comments
          </h3>
          <div className="mt-4 flex min-w-0 gap-2">
            <Input
              aria-label="Comment"
              placeholder="Write a comment. Use @[Name](user:id) to mention."
              value={comment}
              onChange={(event) => {
                setComment(event.target.value);
                typing.startTyping();
              }}
            />
            <Button
              type="button"
              size="icon"
              disabled={comment.trim().length < 1}
              loading={createComment.isPending}
              onClick={addComment}
              aria-label="Create comment"
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {topLevelComments.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)]/65 p-3"
              >
                {editingCommentId === item.id ? (
                  <div className="space-y-2">
                    <Input
                      aria-label="Edit comment"
                      value={editingCommentContent}
                      onChange={(event) => setEditingCommentContent(event.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={cancelEditingComment}
                        aria-label="Cancel comment edit"
                      >
                        <X className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        className="size-8"
                        disabled={editingCommentContent.trim().length < 1}
                        loading={updateComment.isPending}
                        onClick={() => saveComment(item.id)}
                        aria-label="Save comment edit"
                      >
                        <Check className="size-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <p className="min-w-0 flex-1 break-words text-sm text-[var(--app-text)]">
                      {item.content}
                    </p>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => startEditingComment(item)}
                        aria-label="Edit comment"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        loading={deleteComment.isPending}
                        onClick={() => removeComment(item.id)}
                        aria-label="Delete comment"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {item.mentionedUserIds.length ? (
                  <p className="mt-2 text-xs text-[var(--app-subtle)]">
                    Mentions {item.mentionedUserIds.length}
                  </p>
                ) : null}
                <div className="mt-3 space-y-2 border-l border-[var(--app-border)] pl-3">
                  {(repliesByComment.get(item.id) ?? []).map((reply) => (
                    <div
                      key={reply.id}
                      className="rounded-md bg-[var(--app-panel-soft)] px-3 py-2 text-sm text-[var(--app-muted)]"
                    >
                      {editingCommentId === reply.id ? (
                        <div className="space-y-2">
                          <Input
                            aria-label="Edit reply"
                            value={editingCommentContent}
                            onChange={(event) => setEditingCommentContent(event.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={cancelEditingComment}
                              aria-label="Cancel reply edit"
                            >
                              <X className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              className="size-8"
                              disabled={editingCommentContent.trim().length < 1}
                              loading={updateComment.isPending}
                              onClick={() => saveComment(reply.id)}
                              aria-label="Save reply edit"
                            >
                              <Check className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <p className="min-w-0 flex-1 break-words">{reply.content}</p>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => startEditingComment(reply)}
                              aria-label="Edit reply"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              loading={deleteComment.isPending}
                              onClick={() => removeComment(reply.id)}
                              aria-label="Delete reply"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex min-w-0 gap-2">
                  <Input
                    aria-label="Reply"
                    placeholder="Reply"
                    value={replyByCommentId[item.id] ?? ''}
                    onChange={(event) =>
                      setReplyByCommentId((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    disabled={(replyByCommentId[item.id] ?? '').trim().length < 1}
                    onClick={() => addReply(item.id)}
                    aria-label="Reply to comment"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            {!comments.isLoading && topLevelComments.length === 0 ? (
              <p className="text-sm text-[var(--app-subtle)]">No comments yet.</p>
            ) : null}
            {typing.typingUsers.length > 0 ? (
              <p className="text-xs text-[var(--app-subtle)]">
                {typing.typingUsers.map((user) => user.name).join(', ')} typing...
              </p>
            ) : null}
          </div>
        </section>
        <section className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
              <FileUp className="size-4" />
              Attachments
            </h3>
            <label className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] px-3 text-sm font-medium text-[var(--app-text)] hover:border-[var(--app-accent)]">
              Upload
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.docx,.xlsx,.pptx,.zip"
                className="sr-only"
                onChange={(event) => {
                  uploadFile(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </label>
          </div>
          <div className="mt-4 space-y-2">
            {(attachments.data ?? []).map((attachment) => (
              <div
                key={attachment.id}
                className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)]/65 px-3 py-2"
              >
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-[var(--app-text)] hover:text-[var(--app-accent)]"
                >
                  {attachment.originalName}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => deleteAttachment.mutate(attachment.id)}
                  aria-label="Delete attachment"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {!attachments.isLoading && (attachments.data ?? []).length === 0 ? (
              <p className="text-sm text-[var(--app-subtle)]">No attachments yet.</p>
            ) : null}
          </div>
        </section>
        <section className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-4">
          <h3 className="text-sm font-semibold">Activity</h3>
          <div className="mt-4 space-y-2">
            {(activity.data ?? []).map((item) => (
              <div key={item.id} className="rounded-lg bg-[var(--app-bg)]/65 px-3 py-2">
                <p className="break-words text-sm text-[var(--app-text)]">{item.action}</p>
                <p className="mt-1 text-xs text-[var(--app-subtle)]">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {!activity.isLoading && (activity.data ?? []).length === 0 ? (
              <p className="text-sm text-[var(--app-subtle)]">No activity yet.</p>
            ) : null}
          </div>
        </section>
      </div>
      <footer className="flex flex-wrap justify-between gap-3 border-t border-[var(--app-border)] px-5 py-4">
        <Button
          type="button"
          variant="destructive"
          onClick={archive}
          loading={deleteTask.isPending}
        >
          <Archive className="size-4" />
          Archive
        </Button>
        <Button
          type="button"
          onClick={save}
          loading={updateTask.isPending}
          disabled={title.trim().length < 2}
        >
          Save
        </Button>
      </footer>
    </aside>
  );
}
