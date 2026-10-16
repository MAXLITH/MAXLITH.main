export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse font-mono">
      {/* Top Welcome Banner Skeleton */}
      <div className="h-20 bg-[#111720] rounded border border-[#1C2533] p-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-[#1C2533] rounded" />
          <div className="h-3 w-72 bg-[#1C2533]/60 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-[#1C2533] rounded" />
          <div className="h-8 w-28 bg-[#1C2533] rounded" />
        </div>
      </div>

      {/* 4 Summary Cards Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-[#111720] rounded border border-[#1C2533] p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-3 w-28 bg-[#1C2533] rounded" />
              <div className="h-4 w-4 bg-[#1C2533] rounded" />
            </div>
            <div className="h-6 w-36 bg-[#1C2533] rounded" />
            <div className="h-3 w-20 bg-[#1C2533]/60 rounded" />
          </div>
        ))}
      </div>

      {/* Main Grid Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-44 bg-[#111720] rounded border border-[#1C2533] p-5 space-y-4">
            <div className="h-4 w-40 bg-[#1C2533] rounded" />
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-[#0d121c] rounded border border-[#1C2533] p-3 space-y-2">
                  <div className="h-3 w-16 bg-[#1C2533] rounded" />
                  <div className="h-5 w-24 bg-[#1C2533] rounded" />
                </div>
              ))}
            </div>
          </div>

          <div className="h-96 bg-[#111720] rounded border border-[#1C2533] p-5 space-y-4">
            <div className="h-4 w-36 bg-[#1C2533] rounded" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-[#0d121c] rounded border border-[#1C2533]" />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="h-64 bg-[#111720] rounded border border-[#1C2533] p-5 space-y-4">
            <div className="h-4 w-32 bg-[#1C2533] rounded" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-[#0d121c] rounded border border-[#1C2533]" />
              ))}
            </div>
          </div>

          <div className="h-72 bg-[#111720] rounded border border-[#1C2533] p-5 space-y-4">
            <div className="h-4 w-36 bg-[#1C2533] rounded" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-[#1C2533] rounded" />
              <div className="h-4 w-full bg-[#1C2533] rounded" />
              <div className="h-4 w-full bg-[#1C2533] rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
