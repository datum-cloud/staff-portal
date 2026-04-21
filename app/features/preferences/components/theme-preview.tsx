import type { Theme } from '@datum-cloud/datum-ui/theme';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Check } from 'lucide-react';

const SkeletonPreview = ({ variant }: { variant: 'dark' | 'light' }) => {
  const bar100 = variant === 'dark' ? 'bg-slate-700' : 'bg-slate-300';
  const bar75 = variant === 'dark' ? 'bg-slate-600' : 'bg-slate-200';
  const bar85 = variant === 'dark' ? 'bg-slate-700' : 'bg-slate-300';
  return (
    <div className="flex h-full flex-col justify-between p-2">
      <div className="space-y-1">
        <div className={`h-1 w-full rounded ${bar100}`}></div>
        <div className={`h-1 w-3/4 rounded ${bar75}`}></div>
        <div className={`h-1 w-5/6 rounded ${bar85}`}></div>
      </div>
      <div className="space-y-1">
        <div className={`h-1 w-2/3 rounded ${bar75}`}></div>
        <div className={`h-1 w-4/5 rounded ${bar100}`}></div>
        <div className={`h-1 w-1/2 rounded ${bar75}`}></div>
      </div>
      <div className="space-y-1">
        <div className={`h-1 w-full rounded ${bar100}`}></div>
        <div className={`h-1 w-2/3 rounded ${bar75}`}></div>
      </div>
    </div>
  );
};

export const ThemePreview = ({
  value,
  selected,
  onSelect,
  disabled = false,
}: {
  value: Theme;
  selected: boolean;
  onSelect: (value: Theme) => void;
  disabled?: boolean;
}) => {
  const containerClass = cn(
    'data-[selected=true]:border-primary data-[selected=true]:shadow-lg data-[selected=true]:shadow-primary/20 data-[selected=true]:ring-2 data-[selected=true]:ring-primary/10',
    'aspect-video rounded border transition-all',
    value !== 'system' && (value === 'dark' ? 'bg-slate-900' : 'bg-white'),
    value === 'system' && 'relative overflow-hidden',
    disabled && 'opacity-50 cursor-not-allowed'
  );
  return (
    <div className="relative" data-testid={`theme-${value}`}>
      <div className={containerClass} data-selected={selected}>
        {value === 'system' ? (
          <>
            <div
              className="absolute inset-0 bg-slate-900"
              style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>
              <SkeletonPreview variant="dark" />
            </div>
            <div
              className="absolute inset-0 bg-white"
              style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>
              <SkeletonPreview variant="light" />
            </div>
          </>
        ) : (
          <SkeletonPreview variant={value} />
        )}

        {selected && (
          <div className="absolute top-2 right-2 rounded-full border border-gray-500 bg-gray-400 p-1 text-gray-800">
            <Check className="size-3" />
          </div>
        )}
      </div>
      <input
        type="radio"
        name="theme"
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={() => !disabled && onSelect(value)}
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
    </div>
  );
};
