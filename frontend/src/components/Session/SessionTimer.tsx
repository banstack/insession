import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionsApi, labelsApi } from '../../services/api';
import { useSessionTimer } from '../../context/SessionTimerContext';
import type { Session, CreateActivityInput, Label } from '../../types';
import ActivityCard from './ActivityCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as FormLabel } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, Plus, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
];

export default function SessionTimer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Get timer state from context
  const {
    session: contextSession,
    sessionId: contextSessionId,
    loading: contextLoading,
    error: contextError,
    isRunning: contextIsRunning,
    elapsedSeconds: contextElapsedSeconds,
    activityElapsed: contextActivityElapsed,
    loadSession,
    toggleTimer,
    completeSession,
    setSession,
    setActivityElapsed,
  } = useSessionTimer();

  // Local state for viewing sessions not in context (completed or different sessions)
  const [localSession, setLocalSession] = useState<Session | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  // Determine if we're viewing the context session or a local one
  const isViewingContextSession = contextSessionId === id && contextSession;

  // Use context data if viewing the active session, otherwise use local data
  const session = isViewingContextSession ? contextSession : localSession;
  const loading = isViewingContextSession ? contextLoading : localLoading;
  const error = isViewingContextSession ? contextError : localError;

  // For non-context sessions, compute these locally
  const elapsedSeconds = isViewingContextSession ? contextElapsedSeconds : (localSession?.elapsedSeconds || 0);
  const activityElapsed = isViewingContextSession ? contextActivityElapsed : (() => {
    const elapsed: Record<string, number> = {};
    localSession?.activities.forEach(a => {
      elapsed[a.id] = a.elapsedSeconds || 0;
    });
    return elapsed;
  })();
  const isRunning = isViewingContextSession ? contextIsRunning : false;

  // Compute derived values based on the current session
  const totalSeconds = session ? session.activities.reduce((sum, a) => sum + a.durationSeconds, 0) : 0;

  const currentActivityIndex = session ? (() => {
    let accumulated = 0;
    for (let i = 0; i < session.activities.length; i++) {
      accumulated += session.activities[i].durationSeconds;
      if (elapsedSeconds < accumulated) {
        return i;
      }
    }
    return session.activities.length - 1;
  })() : 0;

  const currentActivity = session?.activities[currentActivityIndex] || null;

  const remainingSeconds = session ? (() => {
    let accumulated = 0;
    for (let i = 0; i < session.activities.length; i++) {
      const activityEnd = accumulated + session.activities[i].durationSeconds;
      if (elapsedSeconds < activityEnd) {
        return activityEnd - elapsedSeconds;
      }
      accumulated = activityEnd;
    }
    return 0;
  })() : 0;

  const progress = totalSeconds > 0 ? (elapsedSeconds / totalSeconds) * 100 : 0;
  const isComplete = session?.status === 'COMPLETED' || (totalSeconds > 0 && elapsedSeconds >= totalSeconds);

  // Local UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [pendingActivities, setPendingActivities] = useState<CreateActivityInput[]>([]);
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityDuration, setNewActivityDuration] = useState(25);
  const [newActivityColor, setNewActivityColor] = useState(PRESET_COLORS[0]);
  const [addError, setAddError] = useState('');
  const [labels, setLabels] = useState<Label[]>([]);

  useEffect(() => {
    labelsApi.list().then(response => setLabels(response.labels)).catch(() => {});
  }, []);

  const getLabelForColor = (c: string) => labels.find(l => l.color === c);

  // Load session on mount
  useEffect(() => {
    if (!id) return;

    // First try to load into context (will work for active sessions)
    loadSession(id);

    // Also fetch locally for viewing (handles completed sessions and different sessions)
    const fetchLocalSession = async () => {
      // If context already has this session, don't fetch locally
      if (contextSessionId === id && contextSession) return;

      setLocalLoading(true);
      setLocalError('');
      try {
        const data = await sessionsApi.get(id);
        setLocalSession(data);
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLocalLoading(false);
      }
    };

    fetchLocalSession();
  }, [id, loadSession, contextSessionId, contextSession]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    await toggleTimer();
  };

  const handleComplete = async () => {
    try {
      await completeSession();
      navigate('/');
    } catch {
      // Error is set in context
    }
  };

  const handleAddPendingActivity = () => {
    if (!newActivityName.trim()) {
      setAddError('Activity name is required');
      return;
    }

    const lowerName = newActivityName.trim().toLowerCase();
    const existsInPending = pendingActivities.some(
      a => a.name.trim().toLowerCase() === lowerName
    );
    const existsInSession = session?.activities.some(
      a => a.name.trim().toLowerCase() === lowerName
    );

    if (existsInPending || existsInSession) {
      setAddError('Activity name must be unique');
      return;
    }

    setPendingActivities([
      ...pendingActivities,
      {
        name: newActivityName.trim(),
        durationMinutes: newActivityDuration,
        color: newActivityColor,
      },
    ]);
    setNewActivityName('');
    setNewActivityDuration(25);
    setNewActivityColor(PRESET_COLORS[(pendingActivities.length + 1) % PRESET_COLORS.length]);
    setAddError('');
  };

  const handleRemovePendingActivity = (index: number) => {
    setPendingActivities(pendingActivities.filter((_, i) => i !== index));
  };

  const handleSubmitActivities = async () => {
    if (!session || !id || pendingActivities.length === 0) return;

    try {
      const updatedSession = await sessionsApi.addActivities(id, pendingActivities);
      setSession(updatedSession);

      const newElapsed = { ...activityElapsed };
      updatedSession.activities.forEach(a => {
        if (!(a.id in newElapsed)) {
          newElapsed[a.id] = a.elapsedSeconds || 0;
        }
      });
      setActivityElapsed(newElapsed);

      setPendingActivities([]);
      setShowAddForm(false);
      setAddError('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add activities');
    }
  };

  const canAddActivities = () => {
    if (!session) return false;
    const allDone = session.activities.every(a => a.completed);
    return session.status !== 'COMPLETED' || !allDone;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading session...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-destructive">{error || 'Session not found'}</div>
        <Button variant="ghost" onClick={() => navigate('/')}>
          Go back home
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <Progress value={Math.min(progress, 100)} className="h-3" />
        <div className="flex justify-between text-sm text-muted-foreground mt-2">
          <span>{formatTime(elapsedSeconds)}</span>
          <span>{formatTime(totalSeconds)}</span>
        </div>
      </div>

      {/* Current Activity */}
      <div className="text-center mb-8">
        <div
          className="w-20 h-20 rounded-full mx-auto mb-6 ring-4 ring-background shadow-lg"
          style={{ backgroundColor: currentActivity?.color || '#3B82F6' }}
        />
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {isComplete ? 'Session Complete!' : currentActivity?.name}
        </h1>
        <div className="text-7xl font-mono font-bold text-foreground mb-4 tracking-tight">
          {isComplete ? '00:00' : formatTime(remainingSeconds)}
        </div>
        <p className="text-muted-foreground">
          {isComplete
            ? 'Great work!'
            : `Activity ${currentActivityIndex + 1} of ${session.activities.length}`}
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3 mb-8">
        {!isComplete && (
          <Button
            onClick={handlePlayPause}
            size="lg"
            className={cn(
              "px-8",
              isRunning
                ? "bg-warning hover:bg-warning/90 text-warning-foreground"
                : "bg-success hover:bg-success/90 text-success-foreground"
            )}
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start
              </>
            )}
          </Button>
        )}
        <Button
          onClick={handleComplete}
          variant="secondary"
          size="lg"
          className="px-8"
        >
          <Square className="w-5 h-5" />
          {isComplete ? 'Done' : 'End Session'}
        </Button>
      </div>

      {/* Activities List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Activities</h2>
        {session.activities.map((activity, index) => {
          let accumulatedBefore = 0;
          for (let i = 0; i < index; i++) {
            accumulatedBefore += session.activities[i].durationSeconds;
          }
          const isCompleted = elapsedSeconds >= accumulatedBefore + activity.durationSeconds;
          const isActive = index === currentActivityIndex && !isComplete;
          const actualElapsed = activityElapsed[activity.id] || activity.elapsedSeconds || 0;

          return (
            <ActivityCard
              key={activity.id}
              name={activity.name}
              durationMinutes={activity.durationMinutes}
              color={activity.color}
              completed={isCompleted}
              isActive={isActive}
              elapsedSeconds={actualElapsed}
            />
          );
        })}
      </div>

      {/* Add Activities Section */}
      {canAddActivities() && (
        <div className="mt-6 border-t border-border pt-6">
          {!showAddForm ? (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="w-4 h-4" />
              Add Activities
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">Add Activities</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setPendingActivities([]);
                    setAddError('');
                  }}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>

              {addError && (
                <div className="text-destructive text-sm">{addError}</div>
              )}

              {/* New Activity Form */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <FormLabel>Name</FormLabel>
                  <Input
                    type="text"
                    value={newActivityName}
                    onChange={(e) => setNewActivityName(e.target.value)}
                    placeholder="Activity name"
                    className="mt-1"
                  />
                </div>
                <div className="w-24">
                  <FormLabel>Minutes</FormLabel>
                  <Input
                    type="number"
                    value={newActivityDuration}
                    onChange={(e) => setNewActivityDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleAddPendingActivity}>
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>

              {/* Color/Label Picker */}
              <div>
                <FormLabel>Color</FormLabel>
                <div className="flex gap-3 flex-wrap mt-2">
                  {PRESET_COLORS.map((c) => {
                    const label = getLabelForColor(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewActivityColor(c)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                          newActivityColor === c ? "bg-secondary ring-2 ring-foreground" : "hover:bg-secondary/50"
                        )}
                      >
                        <div
                          className="w-8 h-8 rounded-full"
                          style={{ backgroundColor: c }}
                        />
                        <span className="text-xs text-muted-foreground max-w-[60px] truncate">
                          {label?.name || c}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pending Activities List */}
              {pendingActivities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Activities to add:</h4>
                  {pendingActivities.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: activity.color }}
                        />
                        <span className="font-medium text-foreground">{activity.name}</span>
                        <span className="text-muted-foreground">{activity.durationMinutes} min</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePendingActivity(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={handleSubmitActivities}
                    className="w-full bg-success hover:bg-success/90 text-success-foreground"
                  >
                    <Check className="w-4 h-4" />
                    Add {pendingActivities.length} {pendingActivities.length === 1 ? 'Activity' : 'Activities'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
