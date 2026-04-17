'use client';

interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  height?: number;
  showLabel?: boolean;
  animated?: boolean;
}

export function ProgressBar({
  value,
  color = '#d4e0b5',
  height = 6,
  showLabel = false,
  animated = true,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="flex items-center gap-2 w-full">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height, backgroundColor: '#e8e0d0' }}
      >
        <div
          className={animated ? 'transition-all duration-700 ease-out' : ''}
          style={{
            width: `${clamped}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 'inherit',
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-[#9c8870] w-8 text-right">{clamped}%</span>
      )}
    </div>
  );
}
