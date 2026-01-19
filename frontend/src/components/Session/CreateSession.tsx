import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsApi, labelsApi } from '../../services/api';
import type { CreateActivityInput, Label } from '../../types';
import ActivityCard from './ActivityCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as FormLabel } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <h1 className="text-2xl font-bold text-foreground mb-6">Create New Session</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm border border-destructive/20">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <FormLabel>Name</FormLabel>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Deep Work"
                  className="mt-1"
                />
              </div>

              <div>
                <FormLabel>Duration (min)</FormLabel>
                <Input
                  type="number"
                  min={1}
                  max={180}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-3">
                <FormLabel>Color</FormLabel>
                <div className="flex gap-3 flex-wrap mt-2">
                  {COLORS.map((c) => {
                    const label = getLabelForColor(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                          color === c ? "bg-secondary ring-2 ring-foreground" : "hover:bg-secondary/50"
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
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={addActivity}
            >
              <Plus className="w-4 h-4" />
              Add Activity
            </Button>
          </CardContent>
        </Card>

        {activities.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">
                Activities ({activities.length})
              </h2>
              <span className="text-sm text-muted-foreground">
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

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={loading || activities.length === 0}
        >
          <Play className="w-4 h-4" />
          {loading ? 'Creating...' : 'Start Session'}
        </Button>
      </form>
    </div>
  );
}
