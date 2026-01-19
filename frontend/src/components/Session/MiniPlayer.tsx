import { useLocation, useNavigate } from 'react-router-dom';
import { useSessionTimer } from '../../context/SessionTimerContext';
import { Button } from '@/components/ui/button';
import { Play, Pause, X } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function MiniPlayer() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    session,
    sessionId,
    isRunning,
    currentActivity,
    remainingSeconds,
    isComplete,
    toggleTimer,
    clearSession,
  } = useSessionTimer();

  // Don't show if no active session
  if (!session || !sessionId) return null;

  // Don't show if session is complete
  if (isComplete) return null;

  // Don't show if on the session page
  const isOnSessionPage = location.pathname === `/session/${sessionId}`;
  if (isOnSessionPage) return null;

  const handleClick = () => {
    navigate(`/session/${sessionId}`);
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTimer();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearSession();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "flex items-center gap-3 px-4 py-3",
        "bg-card border border-border rounded-xl shadow-lg",
        "cursor-pointer hover:bg-accent/50 transition-colors",
        "min-w-[280px]"
      )}
    >
      {/* Activity color dot */}
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: currentActivity?.color || '#3B82F6' }}
      />

      {/* Activity name */}
      <span className="font-medium text-foreground truncate flex-1 min-w-0">
        {currentActivity?.name || 'Session'}
      </span>

      {/* Time remaining */}
      <span className="font-mono text-sm text-muted-foreground shrink-0">
        {formatTime(remainingSeconds)}
      </span>

      {/* Play/Pause button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePlayPause}
        className={cn(
          "h-8 w-8 shrink-0",
          isRunning
            ? "text-warning hover:text-warning"
            : "text-success hover:text-success"
        )}
      >
        {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClose}
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
