export default function SprintsLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse">
      {/* Back link skeleton */}
      <div className="mb-6 h-4 w-28 rounded bg-bg-secondary" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-bg-secondary" />
          <div className="h-6 w-56 rounded bg-bg-secondary" />
        </div>
        <div className="h-7 w-24 rounded-md bg-bg-secondary" />
      </div>

      {/* Filters skeleton */}
      <div className="mt-4 flex gap-2">
        <div className="h-8 w-48 rounded bg-bg-secondary" />
        <div className="h-8 w-24 rounded bg-bg-secondary" />
        <div className="h-8 w-24 rounded bg-bg-secondary" />
      </div>

      {/* Sprint row skeletons */}
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-md border border-border-subtle bg-bg-elevated/40 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-5 w-36 rounded bg-bg-secondary" />
                <div className="h-4 w-14 rounded-full bg-bg-secondary" />
              </div>
              <div className="h-4 w-4 rounded bg-bg-secondary" />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-3 w-24 rounded bg-bg-secondary" />
              <div className="h-3 w-20 rounded bg-bg-secondary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
