import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastManager, createUploadFeedback, toastManager } from './toast-manager';

describe('ToastManager', () => {
  afterEach(() => {
    vi.useRealTimers();
    toastManager.clear();
  });

  it('runs loading, success, and error lifecycles', () => {
    vi.useFakeTimers();
    const manager = new ToastManager();
    const id = manager.show({ title: 'Saving', variant: 'loading', persistent: true });

    expect(manager.snapshot()[0]?.variant).toBe('loading');

    manager.update(id, { title: 'Saved', variant: 'success', durationMs: 1000 });
    expect(manager.snapshot()[0]?.title).toBe('Saved');
    expect(manager.snapshot()[0]?.variant).toBe('success');

    vi.advanceTimersByTime(1000);
    expect(manager.snapshot()).toHaveLength(0);

    manager.update('missing', { title: 'Failed', variant: 'error', persistent: true });
    expect(manager.snapshot()[0]?.variant).toBe('error');
  });

  it('caps visible toasts as a queue', () => {
    const manager = new ToastManager();
    Array.from({ length: 7 }).forEach((_, index) =>
      manager.show({ title: `Toast ${index}`, variant: 'info', persistent: true }),
    );

    expect(manager.snapshot()).toHaveLength(5);
    expect(manager.snapshot()[0]?.title).toBe('Toast 6');
  });

  it('stores retry and undo actions', () => {
    const manager = new ToastManager();
    const retry = vi.fn();
    const undo = vi.fn();
    manager.show({
      title: 'Failed',
      variant: 'error',
      action: { label: 'Retry', onClick: retry },
      undo: { label: 'Undo', onClick: undo },
      persistent: true,
    });

    manager.snapshot()[0]?.action?.onClick();
    manager.snapshot()[0]?.undo?.onClick();

    expect(retry).toHaveBeenCalledOnce();
    expect(undo).toHaveBeenCalledOnce();
  });

  it('updates upload progress to completion and failure', () => {
    const feedback = createUploadFeedback('brief.pdf');
    feedback.progress(42);
    expect(toastManager.snapshot()[0]?.progress).toBe(42);

    feedback.success();
    expect(toastManager.snapshot()[0]?.variant).toBe('success');

    const failed = createUploadFeedback('broken.zip');
    failed.error(new Error('Cloud storage rejected the file.'));
    expect(toastManager.snapshot()[0]?.title).toBe('Upload failed');
    expect(toastManager.snapshot()[0]?.description).toBe('Cloud storage rejected the file.');
  });
});
