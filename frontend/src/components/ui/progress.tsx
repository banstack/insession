import * as React from "react"
import { Progress as BaseProgress } from "@base-ui/react/progress"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  indicatorClassName?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, indicatorClassName, ...props }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value))

    return (
      <BaseProgress.Root
        ref={ref}
        value={clampedValue}
        className={cn(
          "relative h-3 w-full overflow-hidden rounded-full bg-secondary",
          className
        )}
        {...props}
      >
        <BaseProgress.Track className="h-full w-full">
          <BaseProgress.Indicator
            className={cn(
              "h-full bg-primary transition-all duration-500 ease-out",
              indicatorClassName
            )}
          />
        </BaseProgress.Track>
      </BaseProgress.Root>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
