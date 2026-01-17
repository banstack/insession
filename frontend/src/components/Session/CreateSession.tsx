import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsApi, labelsApi } from '../../services/api';
import type { CreateActivityInput, Label } from '../../types';
import ActivityCard from './ActivityCard';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function CreateSession() {
  const [activities, setActivities] = useState<CreateActivityInput[]>([]);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(25);
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    labelsApi.list().then(response => setLabels(response.labels)).catch(() => {});
  }, []);

  const getLabelForColor = (c: string) => labels.find(l => l.color === c);

  const addActivity = () => {
    if (!name.trim()) {
      setError('Activity name is required');
      return;
    }

    if (activities.some(a => a.name.toLowerCase() === name.toLowerCase())) {
      setError('Activity names must be unique');
      return;
    }

    setActivities([...activities, { name: name.trim(), durationMinutes: duration, color }]);
    setName('');
    setColor(COLORS[(activities.length + 1) % COLORS.length]);
    setError('');
  };

  const removeActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activities.length === 0) {
      setError('Add at least one activity');
      return;
    }

    setLoading(true);
    try {
      const session = await sessionsApi.create(activities);
      navigate(`/session/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const totalMinutes = activities.reduce((sum, a) => sum + a.durationMinutes, 0);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Session</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Add Activity Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Activity</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Deep Work"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                min={1}
                max={180}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex gap-3 flex-wrap">
                {COLORS.map((c) => {
                  const label = getLabelForColor(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                        color === c ? 'bg-gray-100 ring-2 ring-gray-900' : 'hover:bg-gray-50'
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
          </div>

          <button
            type="button"
            onClick={addActivity}
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            + Add Activity
          </button>
        </div>

        {/* Activities List */}
        {activities.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Activities ({activities.length})
              </h2>
              <span className="text-sm text-gray-500">
                Total: {totalMinutes} minutes
              </span>
            </div>

            {activities.map((activity, index) => (
              <ActivityCard
                key={index}
                name={activity.name}
                durationMinutes={activity.durationMinutes}
                color={activity.color}
                onRemove={() => removeActivity(index)}
              />
            ))}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || activities.length === 0}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating...' : 'Start Session'}
        </button>
      </form>
    </div>
  );
}
