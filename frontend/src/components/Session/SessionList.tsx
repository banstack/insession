import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sessionsApi } from '../../services/api';
import type { Session, Activity } from '../../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Target } from 'lucide-react';

const ActivityBar = ({ activities, totalMinutes }: { activities: Activity[], totalMinutes: number }) => (
  <div className="flex h-3 rounded-full overflow-hidden bg-secondary">
    {activities.map((activity) => {
      const percentage = (activity.durationMinutes / totalMinutes) * 100;
      return (
        <div
          key={activity.id}
          className="h-full flex items-center justify-center overflow-hidden transition-all"
          style={{
            width: `${percentage}%`,
            backgroundColor: activity.completed ? activity.color : '#3f3f46',
          }}
          title={`${activity.name}: ${activity.durationMinutes} min${activity.completed ? '' : ' (incomplete)'}`}
        >
          <span
            className="text-[10px] font-medium truncate px-1"
            style={{
              color: activity.completed ? 'white' : '#71717a',
              textShadow: activity.completed ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
            }}
          >
            {percentage >= 15 ? `${activity.durationMinutes}m` : ''}
          </span>
        </div>
      );
    })}
  </div>
);

export default function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    sessionsApi.list()
      .then(({ sessions }) => setSessions(sessions))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    setDeleting(sessionId);
    try {
      await sessionsApi.delete(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTotalMinutes = (session: Session) => {
    return session.activities.reduce((sum, a) => sum + a.durationMinutes, 0);
  };

  const getDisplayStatus = (session: Session) => {
    if (session.status === 'COMPLETED') {
      const allActivitiesCompleted = session.activities.every(a => a.completed);
      return allActivitiesCompleted ? 'COMPLETED' : 'INCOMPLETE';
    }
    return session.status;
  };

  const getStatusVariant = (status: string): "success" | "warning" | "info" | "secondary" => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'INCOMPLETE':
        return 'warning';
      case 'IN_PROGRESS':
        return 'info';
      case 'PAUSED':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
        {error}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
          <Target className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No sessions yet</h3>
        <p className="text-muted-foreground mb-6">Create your first focused work session</p>
        <Button asChild>
          <Link to="/new">
            <Plus className="w-4 h-4" />
            Create Session
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Card
          key={session.id}
          className="p-4 hover:border-foreground/20 transition-all group"
        >
          <Link to={`/session/${session.id}`} className="block">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {session.activities.slice(0, 4).map((activity, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full ring-1 ring-background"
                    style={{ backgroundColor: activity.color }}
                  />
                ))}
                {session.activities.length > 4 && (
                  <span className="text-xs text-muted-foreground">
                    +{session.activities.length - 4}
                  </span>
                )}
              </div>
              <Badge variant={getStatusVariant(getDisplayStatus(session))}>
                {getDisplayStatus(session).replace('_', ' ')}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {session.activities.length} activities &bull; {getTotalMinutes(session)} min
              </span>
              <span className="text-muted-foreground/60">
                {formatDate(session.createdAt)}
              </span>
            </div>

            <div className="mt-3 w-1/2">
              <ActivityBar
                activities={session.activities}
                totalMinutes={getTotalMinutes(session)}
              />
            </div>
          </Link>

          <div className="mt-3 pt-3 border-t border-border flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleDelete(e, session.id)}
              disabled={deleting === session.id}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {deleting === session.id ? (
                'Deleting...'
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
