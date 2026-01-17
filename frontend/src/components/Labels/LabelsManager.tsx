import { useState, useEffect } from 'react';
import { labelsApi } from '../../services/api';
import type { Label } from '../../types';

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
        <div className="text-gray-500">Loading labels...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Color Labels</h1>
      <p className="text-gray-600 mb-6">
        Assign custom labels to colors to categorize your activities (e.g., "Productivity", "Exercise").
      </p>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
        {COLORS.map(color => {
          const label = getLabelForColor(color);
          const isEditing = editingColor === color;

          return (
            <div key={color} className="p-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />

                {isEditing ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      placeholder="Enter label name"
                      maxLength={50}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') handleCancel();
                      }}
                    />
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      {label ? (
                        <span className="font-medium text-gray-900">{label.name}</span>
                      ) : (
                        <span className="text-gray-400 italic">No label</span>
                      )}
                      <span className="ml-2 text-sm text-gray-400">{color}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(color)}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        {label ? 'Edit' : 'Add Label'}
                      </button>
                      {label && (
                        <button
                          onClick={() => handleDelete(color)}
                          disabled={saving}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
