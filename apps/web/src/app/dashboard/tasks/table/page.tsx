import { TableTaskView, TaskViewShell } from '@/features/tasks/components/advanced-task-views';

export default function TablePage() {
  return (
    <TaskViewShell title="Table">
      <TableTaskView />
    </TaskViewShell>
  );
}
