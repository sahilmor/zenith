import {
  SavedViewsPageContent,
  TaskViewShell,
} from '@/features/tasks/components/advanced-task-views';

export default function SavedViewsPage() {
  return (
    <TaskViewShell title="Saved Views">
      <SavedViewsPageContent />
    </TaskViewShell>
  );
}
