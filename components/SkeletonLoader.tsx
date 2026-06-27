"use client";

interface SkeletonLoaderProps {
  variant?: "task" | "timeline";
  count?: number;
}

export default function SkeletonLoader({ variant = "task", count = 3 }: SkeletonLoaderProps) {
  const items = Array.from({ length: count });

  if (variant === "timeline") {
    return (
      <div className="space-y-4 w-full animate-pulse">
        {items.map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            {/* Timeline Dot */}
            <div className="h-2 w-2 rounded-full bg-border" />
            <div className="flex-1 space-y-2">
              {/* Timeline Text Lines */}
              <div className="h-3 bg-bg-raised rounded w-1/4" />
              <div className="h-2.5 bg-bg-raised rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default: Task card skeleton list
  return (
    <div className="space-y-3 w-full animate-pulse">
      {items.map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-xl border border-border/30 bg-bg-surface h-36 flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-4">
              {/* Title block */}
              <div className="h-4 bg-bg-raised rounded w-2/3" />
              {/* Status pill block */}
              <div className="h-5 bg-bg-raised rounded-full w-12" />
            </div>
            {/* Date block */}
            <div className="h-3 bg-bg-raised rounded w-1/3" />
          </div>

          {/* Progress bar block */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-3 bg-bg-raised rounded w-12" />
              <div className="h-3 bg-bg-raised rounded w-16" />
            </div>
            <div className="h-1.5 bg-bg-raised rounded-full w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
