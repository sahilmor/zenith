import { MyTasksView, TaskViewShell } from '@/features/tasks/components/advanced-task-views';

export default function MyTasksPage() {
  return (
    <TaskViewShell title="My Tasks">
      <MyTasksView />
    </TaskViewShell>
  );
}
