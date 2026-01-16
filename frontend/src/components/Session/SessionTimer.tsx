import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionsApi } from '../../services/api';
import type { Session, ActivityProgress } from '../../types';
import ActivityCard from './ActivityCard';

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
    </div>
  );
}
