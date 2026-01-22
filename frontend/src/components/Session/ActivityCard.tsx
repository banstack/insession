import { cn } from '@/lib/utils';
import { X, Check, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActivityCardProps {
  name: string;
  durationMinutes: number;
  color: string;
  completed?: boolean;
  isActive?: boolean;
  onRemove?: () => void;
}

export default function ActivityCard({
  name,
  durationMinutes,
  color,
  completed = false,
  isActive = false,
  onRemove,
}: ActivityCardProps) {

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border transition-all",
        isActive && "border-info bg-info/5",
        completed && !isActive && "border-success/50 bg-success/5",
        !isActive && !completed && "border-border bg-card"
      )}
    >
      <div className="flex items-center gap-3">
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
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            type="button"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
