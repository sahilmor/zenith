import { FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectBadgeProps {
  name?: string | null | undefined;
  icon?: string | null | undefined;
  color?: string | null | undefined;
  className?: string;
}

export function ProjectBadge({ name, icon, color, className }: ProjectBadgeProps) {
  const fallback = name?.slice(0, 1).toUpperCase();
  return (
    <div
      className={cn(
        'grid size-10 place-items-center rounded-lg border border-white/10 text-sm font-semibold text-white',
        className,
      )}
      style={{ backgroundColor: color ?? 'rgba(255,255,255,0.08)' }}
    >
      {icon || fallback || <FolderKanban className="size-4" />}
    </div>
  );
}
