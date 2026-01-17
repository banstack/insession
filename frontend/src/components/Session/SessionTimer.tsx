import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionsApi, labelsApi } from '../../services/api';
import type { Session, ActivityProgress, CreateActivityInput, Label } from '../../types';
import ActivityCard from './ActivityCard';

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
];

export default function SessionTimer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Track per-activity elapsed time locally
  const [activityElapsed, setActivityElapsed] = useState<Record<string, number>>({});
  const lastActivityIndexRef = useRef<number>(0);

  // Add activities form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [pendingActivities, setPendingActivities] = useState<CreateActivityInput[]>([]);
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityDuration, setNewActivityDuration] = useState(25);
  const [newActivityColor, setNewActivityColor] = useState(PRESET_COLORS[0]);
  const [addError, setAddError] = useState('');
  const [labels, setLabels] = useState<Label[]>([]);

  // Fetch labels for color picker
  useEffect(() => {
    labelsApi.list().then(response => setLabels(response.labels)).catch(() => {});
  }, []);

  const getLabelForColor = (c: string) => labels.find(l => l.color === c);

  // Load session
  useEffect(() => {
    if (!id) return;

    sessionsApi.get(id)
      .then((data) => {
        setSession(data);
        setElapsedSeconds(data.elapsedSeconds);
        setIsRunning(data.status === 'IN_PROGRESS');

        // Initialize activity elapsed times from saved data
        const elapsed: Record<string, number> = {};
        data.activities.forEach(a => {
          elapsed[a.id] = a.elapsedSeconds || 0;
        });
        setActivityElapsed(elapsed);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const getCurrentActivityIndex = useCallback(() => {
    if (!session) return 0;

    let accumulated = 0;
    for (let i = 0; i < session.activities.length; i++) {
      accumulated += session.activities[i].durationSeconds;
      if (elapsedSeconds < accumulated) {
        return i;
      }
    }
    return session.activities.length - 1;
  }, [session, elapsedSeconds]);

  // Timer logic - also tracks per-activity time
  useEffect(() => {
    if (!isRunning || !session) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const newElapsed = prev + 1;

        // Update current activity's elapsed time
        const currentIndex = getCurrentActivityIndex();
        const currentActivity = session.activities[currentIndex];

        if (currentActivity) {
          setActivityElapsed(prev => ({
            ...prev,
            [currentActivity.id]: (prev[currentActivity.id] || 0) + 1
          }));
        }

        return newElapsed;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, session, getCurrentActivityIndex]);

  // Build activity progress for API
  const getActivityProgress = useCallback((): ActivityProgress[] => {
    if (!session) return [];

    return session.activities.map((activity, index) => {
      let accumulatedBefore = 0;
      for (let i = 0; i < index; i++) {
        accumulatedBefore += session.activities[i].durationSeconds;
      }
      const isCompleted = elapsedSeconds >= accumulatedBefore + activity.durationSeconds;

      return {
        id: activity.id,
        elapsedSeconds: activityElapsed[activity.id] || 0,
        completed: isCompleted,
      };
    });
  }, [session, elapsedSeconds, activityElapsed]);

  // Auto-save progress every 10 seconds
  useEffect(() => {
    if (!session || !id) return;

    const saveInterval = setInterval(() => {
      if (isRunning) {
        const currentActivityIndex = getCurrentActivityIndex();
        sessionsApi.update(id, {
          elapsedSeconds,
          currentActivityIndex,
          status: 'IN_PROGRESS',
          activityProgress: getActivityProgress(),
        }).catch(console.error);
      }
    }, 10000);

    return () => clearInterval(saveInterval);
  }, [session, id, isRunning, elapsedSeconds, getCurrentActivityIndex, getActivityProgress]);

  const getTotalSeconds = useCallback(() => {
    if (!session) return 0;
    return session.activities.reduce((sum, a) => sum + a.durationSeconds, 0);
  }, [session]);

  const getCurrentActivityTime = useCallback(() => {
    if (!session) return { remaining: 0, elapsed: 0 };

    let accumulated = 0;
    for (let i = 0; i < session.activities.length; i++) {
      const activityEnd = accumulated + session.activities[i].durationSeconds;
      if (elapsedSeconds < activityEnd) {
        return {
          elapsed: elapsedSeconds - accumulated,
          remaining: activityEnd - elapsedSeconds,
        };
      }
      accumulated = activityEnd;
    }
    return { elapsed: 0, remaining: 0 };
  }, [session, elapsedSeconds]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    if (!session || !id) return;

    const newStatus = isRunning ? 'PAUSED' : 'IN_PROGRESS';
    setIsRunning(!isRunning);

    try {
      await sessionsApi.update(id, {
        status: newStatus,
        elapsedSeconds,
        currentActivityIndex: getCurrentActivityIndex(),
        activityProgress: getActivityProgress(),
      });
    } catch (err) {
      console.error('Failed to update session:', err);
    }
  };

  const handleComplete = async () => {
    if (!session || !id) return;

    try {
      await sessionsApi.update(id, {
        status: 'COMPLETED',
        elapsedSeconds,
        activityProgress: getActivityProgress(),
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete session');
    }
  };

  const handleAddPendingActivity = () => {
    if (!newActivityName.trim()) {
      setAddError('Activity name is required');
      return;
    }

    // Check for duplicate names in pending activities
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

      // Initialize elapsed times for new activities
      const newElapsed = { ...activityElapsed };
      updatedSession.activities.forEach(a => {
        if (!(a.id in newElapsed)) {
          newElapsed[a.id] = a.elapsedSeconds || 0;
        }
      });
      setActivityElapsed(newElapsed);

      // Reset form
      setPendingActivities([]);
      setShowAddForm(false);
      setAddError('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add activities');
    }
  };

  // Determine if session allows adding activities
  const canAddActivities = () => {
    if (!session) return false;
    const allDone = session.activities.every(a => a.completed);
    // Allow if not COMPLETED, or if COMPLETED but not all activities done (INCOMPLETE)
    return session.status !== 'COMPLETED' || !allDone;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading session...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-red-500">{error || 'Session not found'}</div>
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:text-blue-800"
        >
          Go back home
        </button>
      </div>
    );
  }

  const currentIndex = getCurrentActivityIndex();
  const currentActivity = session.activities[currentIndex];
  const { remaining } = getCurrentActivityTime();
  const totalSeconds = getTotalSeconds();
  const progress = (elapsedSeconds / totalSeconds) * 100;
  const isComplete = elapsedSeconds >= totalSeconds;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-1000"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-500 mt-2">
          <span>{formatTime(elapsedSeconds)}</span>
          <span>{formatTime(totalSeconds)}</span>
        </div>
      </div>

      {/* Current Activity */}
      <div className="text-center mb-8">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4"
          style={{ backgroundColor: currentActivity?.color || '#3B82F6' }}
        />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isComplete ? 'Session Complete!' : currentActivity?.name}
        </h1>
        <div className="text-6xl font-mono font-bold text-gray-900 mb-4">
          {isComplete ? '00:00' : formatTime(remaining)}
        </div>
        <p className="text-gray-500">
          {isComplete
            ? 'Great work!'
            : `Activity ${currentIndex + 1} of ${session.activities.length}`}
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 mb-8">
        {!isComplete && (
          <button
            onClick={handlePlayPause}
            className={`px-8 py-3 rounded-full font-medium text-white transition-colors ${
              isRunning
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
        )}
        <button
          onClick={handleComplete}
          className="px-8 py-3 rounded-full font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
        >
          {isComplete ? 'Done' : 'End Session'}
        </button>
      </div>

      {/* Activities List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Activities</h2>
        {session.activities.map((activity, index) => {
          let accumulatedBefore = 0;
          for (let i = 0; i < index; i++) {
            accumulatedBefore += session.activities[i].durationSeconds;
          }
          const isCompleted = elapsedSeconds >= accumulatedBefore + activity.durationSeconds;
          const isActive = index === currentIndex && !isComplete;
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
        <div className="mt-6 border-t pt-6">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
              + Add Activities
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Add Activities</h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setPendingActivities([]);
                    setAddError('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>

              {addError && (
                <div className="text-red-500 text-sm">{addError}</div>
              )}

              {/* New Activity Form */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Name</label>
                  <input
                    type="text"
                    value={newActivityName}
                    onChange={(e) => setNewActivityName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Activity name"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm text-gray-600 mb-1">Minutes</label>
                  <input
                    type="number"
                    value={newActivityDuration}
                    onChange={(e) => setNewActivityDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleAddPendingActivity}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Color/Label Picker */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Color</label>
                <div className="flex gap-3 flex-wrap">
                  {PRESET_COLORS.map((c) => {
                    const label = getLabelForColor(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewActivityColor(c)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                          newActivityColor === c ? 'bg-gray-100 ring-2 ring-gray-900' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full"
                          style={{ backgroundColor: c }}
                        />
                        <span className="text-xs text-gray-600 max-w-[60px] truncate">
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
                  <h4 className="text-sm font-medium text-gray-700">Activities to add:</h4>
                  {pendingActivities.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: activity.color }}
                        />
                        <span className="font-medium">{activity.name}</span>
                        <span className="text-gray-500">{activity.durationMinutes} min</span>
                      </div>
                      <button
                        onClick={() => handleRemovePendingActivity(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleSubmitActivities}
                    className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Add {pendingActivities.length} {pendingActivities.length === 1 ? 'Activity' : 'Activities'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
