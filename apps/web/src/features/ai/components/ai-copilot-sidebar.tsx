'use client';

import {
  Bot,
  Command,
  Loader2,
  PanelRightClose,
  Pin,
  PinOff,
  Search,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useAiStore } from '@/stores/ai-store';
import {
  useAiConversations,
  useAiSearch,
  useAiStreamChat,
  useUpdateAiConversation,
} from '../api/ai-hooks';

export function AiCopilotSidebar() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const open = useAiStore((state) => state.sidebarOpen);
  const setOpen = useAiStore((state) => state.setSidebarOpen);
  const toggle = useAiStore((state) => state.toggleSidebar);
  const currentConversationId = useAiStore((state) => state.currentConversationId);
  const setCurrentConversationId = useAiStore((state) => state.setCurrentConversationId);
  const conversations = useAiConversations(workspaceId);
  const chat = useAiStreamChat();
  const search = useAiSearch();
  const updateConversation = useUpdateAiConversation();
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState('');
  const streamController = useRef<AbortController | null>(null);
  const current = useMemo(
    () =>
      conversations.data?.find((item) => item.id === currentConversationId) ??
      conversations.data?.[0],
    [conversations.data, currentConversationId],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  useEffect(() => {
    if (!currentConversationId && current) setCurrentConversationId(current.id);
  }, [current, currentConversationId, setCurrentConversationId]);

  const send = () => {
    if (!workspaceId || !message.trim()) return;
    setDraft('');
    streamController.current?.abort();
    streamController.current = new AbortController();
    chat.mutate(
      {
        workspaceId,
        message: message.trim(),
        references: [],
        onToken: (token) => setDraft((value) => `${value}${token}`),
        signal: streamController.current.signal,
        ...(current?.id ? { conversationId: current.id } : {}),
      },
      {
        onSuccess: (result) => {
          if (result.conversationId) setCurrentConversationId(result.conversationId);
          setDraft('');
          streamController.current = null;
        },
        onError: () => {
          setDraft('');
          streamController.current = null;
        },
      },
    );
    setMessage('');
  };

  const runSearch = () => {
    if (!workspaceId || !searchQuery.trim()) return;
    search.mutate({ workspaceId, query: searchQuery.trim() });
  };

  if (!open) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="grid size-9 place-items-center rounded-lg bg-emerald-400 text-slate-950">
          <Bot className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">AI Copilot</h2>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <Command className="size-3" /> Cmd/Ctrl + I
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => setOpen(false)}
        >
          <PanelRightClose className="size-5" />
        </Button>
      </div>
      <div className="grid min-h-0 flex-1 md:grid-cols-[180px_1fr]">
        <div className="border-b border-white/10 p-3 md:border-b-0 md:border-r">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setCurrentConversationId(null)}
          >
            <Sparkles className="size-4" />
            New chat
          </Button>
          <div className="mt-3 space-y-2">
            {conversations.data?.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setCurrentConversationId(conversation.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                {conversation.pinned ? <Pin className="size-3" /> : <Bot className="size-3" />}
                <span className="truncate">{conversation.title}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="border-b border-white/10 p-3">
            <div className="flex gap-2">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') runSearch();
                }}
                placeholder="Ask: show overdue backend tasks"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              />
              <Button type="button" variant="secondary" onClick={runSearch}>
                <Search className="size-4" />
              </Button>
            </div>
            {search.data ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400">
                <p className="font-medium text-white">{search.data.tasks.length} matching tasks</p>
                <div className="mt-2 space-y-1">
                  {search.data.tasks.slice(0, 4).map((task) => (
                    <p key={task.id} className="truncate">
                      {task.title}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {current?.messages.length ? (
              current.messages.map((item) => (
                <div key={item.id} className={item.role === 'user' ? 'text-right' : 'text-left'}>
                  <div
                    className={
                      item.role === 'user'
                        ? 'ml-auto inline-block max-w-[85%] rounded-lg bg-emerald-400 px-3 py-2 text-sm text-slate-950'
                        : 'inline-block max-w-[90%] rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200'
                    }
                  >
                    <MarkdownLite content={item.content} />
                  </div>
                </div>
              ))
            ) : (
              <Card className="rounded-lg p-5 text-sm text-slate-400">
                Ask Zenith AI to generate tasks, summarize a project, improve a task title, search
                work, or draft release notes.
              </Card>
            )}
            {chat.isPending ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <Loader2 className="size-4 animate-spin" />
                  Streaming response
                  <button
                    type="button"
                    aria-label="Cancel AI response"
                    className="ml-auto text-slate-500 hover:text-white"
                    onClick={() => {
                      streamController.current?.abort();
                      streamController.current = null;
                      chat.reset();
                      setDraft('');
                    }}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <MarkdownLite content={draft || 'Preparing response...'} />
              </div>
            ) : null}
          </div>
          <div className="border-t border-white/10 p-3">
            {current ? (
              <div className="mb-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    updateConversation.mutate({
                      conversationId: current.id,
                      pinned: !current.pinned,
                    })
                  }
                >
                  {current.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                  {current.pinned ? 'Unpin' : 'Pin'}
                </Button>
              </div>
            ) : null}
            <div className="flex gap-2">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask AI to plan, summarize, rewrite, translate, or reason about work"
                className="min-h-20 flex-1 resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              />
              <Button
                type="button"
                aria-label="Send AI message"
                onClick={send}
                disabled={!message.trim() || chat.isPending}
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MarkdownLite({ content }: { readonly content: string }) {
  return (
    <div className="space-y-1 whitespace-pre-wrap leading-6">
      {content.split('\n').map((line, index) => {
        const key = `${index}-${line.slice(0, 8)}`;
        if (line.startsWith('```'))
          return <code key={key} className="block rounded bg-black/30 px-2 py-1 text-xs" />;
        if (/^[-*]\s/.test(line)) return <p key={key}>• {line.replace(/^[-*]\s/, '')}</p>;
        return <p key={key}>{line}</p>;
      })}
    </div>
  );
}
