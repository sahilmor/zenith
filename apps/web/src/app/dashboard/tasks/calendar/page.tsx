import { CalendarTaskView, TaskViewShell } from '@/features/tasks/components/advanced-task-views';

export default function CalendarPage() {
  return (
    <TaskViewShell title="Calendar">
      <CalendarTaskView />
    </TaskViewShell>
  );
}
