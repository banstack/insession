import { useState, useEffect } from 'react';
import { labelsApi } from '../../services/api';
import type { Label } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Pencil, Trash2, Check, X } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function LabelsManager() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [editingColor, setEditingColor] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLabels();
  }, []);

  const loadLabels = async () => {
    try {
      const response = await labelsApi.list();
      setLabels(response.labels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load label');
    } finally {
      setLoading(false);
    }
  };

  const getLabelForColor = (color: string) => {
    return labels.find(l => l.color === color);
  };

  const handleEdit = (color: string) => {
    const label = getLabelForColor(color);
    setEditingColor(color);
    setEditingName(label?.name || '');
    setError('');
  };

  const handleCancel = () => {
    setEditingColor(null);
    setEditingName('');
    setError('');
  };

  const handleSave = async () => {
    if (!editingColor) return;

    if (!editingName.trim()) {
      setError('Label name is required');
      return;
    }

    setSaving(true);
    try {
      const savedLabel = await labelsApi.upsert(editingColor, editingName.trim());
      setLabels(prev => {
        const existing = prev.find(l => l.color === editingColor);
        if (existing) {
          return prev.map(l => l.color === editingColor ? savedLabel : l);
        }
        return [...prev, savedLabel];
      });
      setEditingColor(null);
      setEditingName('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save label');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (color: string) => {
    setSaving(true);
    try {
      await labelsApi.delete(color);
      setLabels(prev => prev.filter(l => l.color !== color));
      if (editingColor === color) {
        setEditingColor(null);
        setEditingName('');
      }
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete label');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-muted-foreground">Loading labels...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-foreground mb-2">Color Labels</h1>
      <p className="text-muted-foreground mb-6">
        Assign custom labels to colors to categorize your activities (e.g., "Productivity", "Exercise").
      </p>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm mb-4 border border-destructive/20">
          {error}
        </div>
      )}

      <Card className="divide-y divide-border">
        {COLORS.map(color => {
          const label = getLabelForColor(color);
          const isEditing = editingColor === color;

          return (
            <div key={color} className="p-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0 ring-2 ring-background"
                  style={{ backgroundColor: color }}
                />

                {isEditing ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      placeholder="Enter label name"
                      maxLength={50}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') handleCancel();
                      }}
                    />
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      size="sm"
                    >
                      <Check className="w-4 h-4" />
                      Save
                    </Button>
                    <Button
                      onClick={handleCancel}
                      disabled={saving}
                      variant="secondary"
                      size="sm"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      {label ? (
                        <span className="font-medium text-foreground">{label.name}</span>
                      ) : (
                        <span className="text-muted-foreground italic">No label</span>
                      )}
                      <span className="ml-2 text-sm text-muted-foreground/60">{color}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(color)}
                        variant="secondary"
                        size="sm"
                      >
                        <Pencil className="w-4 h-4" />
                        {label ? 'Edit' : 'Add Label'}
                      </Button>
                      {label && (
                        <Button
                          onClick={() => handleDelete(color)}
                          disabled={saving}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
