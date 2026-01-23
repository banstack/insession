import { cn } from '@/lib/utils';
import { GripVertical, Trash2, Check, Play } from 'lucide-react';

interface ActivityCardProps {
  name: string;
  durationMinutes: number;
  color: string;
  completed?: boolean;
  isActive?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  draggable?: boolean;
  onDelete?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}

export default function ActivityCard({
  name,
  durationMinutes,
  color,
  completed = false,
  isActive = false,
  isDragging = false,
  isDragOver = false,
  draggable = false,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: ActivityCardProps) {

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border transition-all",
        isActive && "border-info bg-info/5",
        completed && !isActive && "border-success/50 bg-success/5",
        !isActive && !completed && "border-border bg-card",
        isDragging && "opacity-50 border-dashed",
        isDragOver && "border-primary border-2"
      )}
    >
      <div className="flex items-center gap-3">
        {draggable && (
          <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        <div
          className="w-4 h-4 rounded-full ring-2 ring-background"
          style={{ backgroundColor: color }}
        />
        <div>
          <p className={cn(
            "font-medium",
            completed ? "line-through text-muted-foreground" : "text-foreground"
          )}>
            {name}
          </p>
          <p className="text-sm text-muted-foreground">{durationMinutes} min</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {completed && (
          <span className="flex items-center gap-1 text-success text-sm font-medium">
            <Check className="w-4 h-4" />
            Done
          </span>
        )}
        {isActive && (
          <span className="flex items-center gap-1 text-info text-sm font-medium">
            <Play className="w-4 h-4" />
            Active
          </span>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
