interface ActivityCardProps {
  name: string;
  durationMinutes: number;
  color: string;
  completed?: boolean;
  isActive?: boolean;
  elapsedSeconds?: number;
  onRemove?: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ActivityCard({
  name,
  durationMinutes,
  color,
  completed = false,
  isActive = false,
  elapsedSeconds,
  onRemove,
}: ActivityCardProps) {
  const plannedSeconds = durationMinutes * 60;
  const hasElapsedTime = elapsedSeconds !== undefined && elapsedSeconds > 0;

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
        isActive
          ? 'border-blue-500 bg-blue-50'
          : completed
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div>
          <p className={`font-medium ${completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {name}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">{durationMinutes} min planned</span>
            {hasElapsedTime && (
              <>
                <span className="text-gray-300">•</span>
                <span className={`font-medium ${
                  elapsedSeconds >= plannedSeconds
                    ? 'text-green-600'
                    : 'text-orange-500'
                }`}>
                  {formatTime(elapsedSeconds)} actual
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {completed && (
          <span className="text-green-500 text-sm font-medium">Done</span>
        )}
        {isActive && (
          <span className="text-blue-500 text-sm font-medium">Active</span>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 p-1"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
