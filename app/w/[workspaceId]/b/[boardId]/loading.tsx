export default function BoardLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse">
      {/* Back link skeleton */}
      <div className="mb-6 h-4 w-20 rounded bg-bg-secondary" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="h-6 w-48 rounded bg-bg-secondary" />
          <div className="mt-2 h-3 w-64 rounded bg-bg-secondary" />
          <div className="mt-2 h-3 w-32 rounded bg-bg-secondary" />
        </div>
        <div className="h-8 w-8 rounded bg-bg-secondary" />
      </div>

      {/* Filters skeleton */}
      <div className="mt-6 flex gap-2">
        <div className="h-8 w-48 rounded bg-bg-secondary" />
        <div className="h-8 w-24 rounded bg-bg-secondary" />
        <div className="h-8 w-24 rounded bg-bg-secondary" />
      </div>

      {/* Kanban columns skeleton */}
      <div className="mt-4 grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="space-y-3">
            <div className="h-5 w-24 rounded bg-bg-secondary" />
            {Array.from({ length: 3 - col }).map((_, row) => (
              <div
                key={row}
                className="h-24 rounded-md border border-border-subtle bg-bg-elevated/40"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
