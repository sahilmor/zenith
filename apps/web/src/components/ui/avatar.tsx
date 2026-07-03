import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  name?: string | null | undefined;
  src?: string | null | undefined;
  className?: string;
}

export function Avatar({ name, src, className }: AvatarProps) {
  const initials = name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={cn(
        'flex size-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10 text-xs font-semibold text-white',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name ?? 'User avatar'} className="size-full object-cover" />
      ) : (
        initials || <User className="size-4" />
      )}
    </div>
  );
}
