import { TaskViewShell, TimelineTaskView } from '@/features/tasks/components/advanced-task-views';

export default function TimelinePage() {
  return (
    <TaskViewShell title="Timeline">
      <TimelineTaskView />
    </TaskViewShell>
  );
}
