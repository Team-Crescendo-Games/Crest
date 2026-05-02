export default function TaskDetailLoading() {
  return (
    <div className="animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="mb-4 h-4 w-40 rounded bg-bg-secondary" />

      <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        {/* Left column */}
        <div className="space-y-4">
          {/* Title */}
          <div className="h-10 w-full rounded-md bg-bg-secondary" />
          {/* Description */}
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-bg-secondary" />
            <div className="h-4 w-3/4 rounded bg-bg-secondary" />
            <div className="h-4 w-1/2 rounded bg-bg-secondary" />
          </div>
          {/* Points */}
          <div className="h-8 w-24 rounded bg-bg-secondary" />
          {/* Assignees */}
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-bg-secondary" />
            <div className="h-6 w-20 rounded-full bg-bg-secondary" />
          </div>
          {/* Action row */}
          <div className="flex gap-2 border-t border-border pt-4">
            <div className="h-8 w-28 rounded-md bg-bg-secondary" />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i}>
              <div className="mb-1 h-3 w-16 rounded bg-bg-secondary" />
              <div className="h-6 w-full rounded bg-bg-secondary" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
