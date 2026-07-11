import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkspaceAvatarProps {
  name?: string | null | undefined;
  logo?: string | null | undefined;
  className?: string;
}

export function WorkspaceAvatar({ name, logo, className }: WorkspaceAvatarProps) {
  const initials = name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={cn(
        'grid size-9 place-items-center overflow-hidden rounded-lg border border-white/10 bg-emerald-400 text-xs font-bold text-slate-950',
        className,
      )}
    >
      {logo ? (
        <img src={logo} alt={name ?? 'Workspace logo'} className="size-full object-cover" />
      ) : (
        initials || <Building2 className="size-4" />
      )}
    </div>
  );
}
