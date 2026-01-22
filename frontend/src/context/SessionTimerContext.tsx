import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Session, Activity, ActivityProgress } from '../types';
import { sessionsApi } from '../services/api';

interface SessionTimerContextType {
  session: Session | null;
  sessionId: string | null;
  loading: boolean;
  error: string;
  isRunning: boolean;
  elapsedSeconds: number;
  activityElapsed: Record<string, number>;
  currentActivity: Activity | null;
  remainingSeconds: number;
  progress: number;
  isComplete: boolean;
  loadSession: (id: string) => Promise<void>;
  toggleTimer: () => Promise<void>;
  completeSession: () => Promise<void>;
  clearSession: () => void;
  setSession: (session: Session) => void;
  setActivityElapsed: (elapsed: Record<string, number>) => void;
}

const SessionTimerContext = createContext<SessionTimerContextType | null>(null);

export function SessionTimerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activityElapsed, setActivityElapsed] = useState<Record<string, number>>({});

  // Use refs to avoid stale closures in intervals
  const sessionRef = useRef(session);
  const elapsedSecondsRef = useRef(elapsedSeconds);
  const activityElapsedRef = useRef(activityElapsed);
  const isRunningRef = useRef(isRunning);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    activityElapsedRef.current = activityElapsed;
  }, [activityElapsed]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const getCurrentActivityIndex = useCallback(() => {
    const currentSession = sessionRef.current;
    const currentElapsed = elapsedSecondsRef.current;
    if (!currentSession) return 0;

    let accumulated = 0;
    for (let i = 0; i < currentSession.activities.length; i++) {
      accumulated += currentSession.activities[i].durationSeconds;
      if (currentElapsed < accumulated) {
        return i;
      }
    }
    return currentSession.activities.length - 1;
  }, []);

  const getTotalSeconds = useCallback(() => {
    if (!session) return 0;
    return session.activities.reduce((sum, a) => sum + a.durationSeconds, 0);
  }, [session]);

  const getActivityProgress = useCallback((): ActivityProgress[] => {
    const currentSession = sessionRef.current;
    const currentElapsed = elapsedSecondsRef.current;
    const currentActivityElapsed = activityElapsedRef.current;
    if (!currentSession) return [];

    return currentSession.activities.map((activity, index) => {
      let accumulatedBefore = 0;
      for (let i = 0; i < index; i++) {
        accumulatedBefore += currentSession.activities[i].durationSeconds;
      }
      const isCompleted = currentElapsed >= accumulatedBefore + activity.durationSeconds;

      return {
        id: activity.id,
        elapsedSeconds: currentActivityElapsed[activity.id] || 0,
        completed: isCompleted,
      };
    });
  }, []);

  // Timer interval
  useEffect(() => {
    if (!isRunning || !session) return;

    const interval = setInterval(() => {
      // Update elapsed seconds using ref to avoid stale closure
      const newElapsed = elapsedSecondsRef.current + 1;
      elapsedSecondsRef.current = newElapsed;
      setElapsedSeconds(newElapsed);

      // Update activity elapsed separately (not nested in state updater)
      const currentIndex = getCurrentActivityIndex();
      const currentActivity = sessionRef.current?.activities[currentIndex];

      if (currentActivity) {
        const currentActivityElapsed = activityElapsedRef.current;
        const updated = {
          ...currentActivityElapsed,
          [currentActivity.id]: (currentActivityElapsed[currentActivity.id] || 0) + 1
        };
        activityElapsedRef.current = updated;
        setActivityElapsed(updated);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, session, getCurrentActivityIndex]);

  // Auto-save interval
  useEffect(() => {
    if (!session || !sessionId) return;

    const saveInterval = setInterval(() => {
      if (isRunningRef.current) {
        const currentActivityIndex = getCurrentActivityIndex();
        sessionsApi.update(sessionId, {
          elapsedSeconds: elapsedSecondsRef.current,
          currentActivityIndex,
          status: 'IN_PROGRESS',
          activityProgress: getActivityProgress(),
        }).catch(console.error);
      }
    }, 10000);

    return () => clearInterval(saveInterval);
  }, [session, sessionId, getCurrentActivityIndex, getActivityProgress]);

  const loadSession = useCallback(async (id: string) => {
    // If already loaded this session, don't reload
    if (sessionId === id && session) return;

    // If we have an active session and are trying to load a different session,
    // don't replace it - let the component handle viewing other sessions locally
    const hasActiveSession = session && session.status !== 'COMPLETED';
    if (hasActiveSession && sessionId !== id) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await sessionsApi.get(id);

      // Only load into context if it's not a completed session
      // (completed sessions should be viewed locally in the component)
      if (data.status === 'COMPLETED') {
        setLoading(false);
        return;
      }

      setSession(data);
      setSessionId(id);
      setElapsedSeconds(data.elapsedSeconds);
      elapsedSecondsRef.current = data.elapsedSeconds;
      setIsRunning(data.status === 'IN_PROGRESS');
      isRunningRef.current = data.status === 'IN_PROGRESS';

      const elapsed: Record<string, number> = {};
      data.activities.forEach(a => {
        elapsed[a.id] = a.elapsedSeconds || 0;
      });
      setActivityElapsed(elapsed);
      activityElapsedRef.current = elapsed;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId, session]);

  const toggleTimer = useCallback(async () => {
    if (!session || !sessionId) return;

    const newIsRunning = !isRunning;
    const newStatus = newIsRunning ? 'IN_PROGRESS' : 'PAUSED';
    setIsRunning(newIsRunning);
    isRunningRef.current = newIsRunning;

    try {
      await sessionsApi.update(sessionId, {
        status: newStatus,
        elapsedSeconds: elapsedSecondsRef.current,
        currentActivityIndex: getCurrentActivityIndex(),
        activityProgress: getActivityProgress(),
      });
    } catch (err) {
      console.error('Failed to update session:', err);
    }
  }, [session, sessionId, isRunning, getCurrentActivityIndex, getActivityProgress]);

  const completeSession = useCallback(async () => {
    if (!session || !sessionId) return;

    try {
      await sessionsApi.update(sessionId, {
        status: 'COMPLETED',
        elapsedSeconds: elapsedSecondsRef.current,
        activityProgress: getActivityProgress(),
      });
      setIsRunning(false);
      isRunningRef.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete session');
      throw err;
    }
  }, [session, sessionId, getActivityProgress]);

  const clearSession = useCallback(() => {
    setSession(null);
    setSessionId(null);
    setLoading(false);
    setError('');
    setIsRunning(false);
    setElapsedSeconds(0);
    setActivityElapsed({});
    isRunningRef.current = false;
    elapsedSecondsRef.current = 0;
    activityElapsedRef.current = {};
  }, []);

  // Computed values
  const totalSeconds = getTotalSeconds();
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
  const isComplete = totalSeconds > 0 && elapsedSeconds >= totalSeconds;

  return (
    <SessionTimerContext.Provider
      value={{
        session,
        sessionId,
        loading,
        error,
        isRunning,
        elapsedSeconds,
        activityElapsed,
        currentActivity,
        remainingSeconds,
        progress,
        isComplete,
        loadSession,
        toggleTimer,
        completeSession,
        clearSession,
        setSession,
        setActivityElapsed,
      }}
    >
      {children}
    </SessionTimerContext.Provider>
  );
}

export function useSessionTimer() {
  const context = useContext(SessionTimerContext);
  if (!context) {
    throw new Error('useSessionTimer must be used within a SessionTimerProvider');
  }
  return context;
}
