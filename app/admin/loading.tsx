export default function AdminLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="h-10 bg-muted rounded w-64 mb-8"></div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="border rounded-lg p-6">
              <div className="h-4 bg-muted rounded w-32 mb-3"></div>
              <div className="h-8 bg-muted rounded w-16"></div>
            </div>
          ))}
        </div>

        {/* Recent comparisons skeleton */}
        <div className="mb-6">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 flex justify-between items-center">
              <div className="flex-1">
                <div className="h-5 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
              <div className="h-8 bg-muted rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
