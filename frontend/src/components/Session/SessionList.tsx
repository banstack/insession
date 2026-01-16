import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sessionsApi } from '../../services/api';
import type { Session } from '../../types';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-500 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">🎯</div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">No sessions yet</h3>
        <p className="text-gray-500 mb-6">Create your first focused work session</p>
        <Link
          to="/new"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Create Session
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <Link to={`/session/${session.id}`} className="block">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {session.activities.slice(0, 4).map((activity, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: activity.color }}
                  />
                ))}
                {session.activities.length > 4 && (
                  <span className="text-xs text-gray-400">
                    +{session.activities.length - 4}
                  </span>
                )}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(session.status)}`}>
                {session.status.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {session.activities.length} activities • {getTotalMinutes(session)} min
              </span>
              <span className="text-gray-400">
                {formatDate(session.createdAt)}
              </span>
            </div>
          </Link>

          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
            <button
              onClick={(e) => handleDelete(e, session.id)}
              disabled={deleting === session.id}
              className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50 flex items-center gap-1"
            >
              {deleting === session.id ? (
                'Deleting...'
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
