export function JobsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Welcome Banner Skeleton */}
      <div className="h-40 rounded-3xl bg-slate-800/40 border border-slate-800/60" />

      {/* Platform Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-800/40 border border-slate-800/60" />
        ))}
      </div>

      {/* Main Content & Sidebar Skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <div className="h-10 rounded-xl bg-slate-800/40 border border-slate-800/60" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-800/40 border border-slate-800/60" />
          ))}
        </div>
        <div className="space-y-6">
          <div className="h-72 rounded-2xl bg-slate-800/40 border border-slate-800/60" />
          <div className="h-60 rounded-2xl bg-slate-800/40 border border-slate-800/60" />
        </div>
      </div>
    </div>
  );
}
