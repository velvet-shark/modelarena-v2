export default function ComparisonDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        {/* Breadcrumb skeleton */}
        <div className="h-4 bg-muted rounded w-64 mb-6"></div>

        {/* Title and description skeleton */}
        <div className="mb-8">
          <div className="h-10 bg-muted rounded w-2/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-full mb-2"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </div>

        {/* Source image skeleton */}
        <div className="mb-6">
          <div className="h-6 bg-muted rounded w-32 mb-3"></div>
          <div className="w-64 aspect-video bg-muted rounded"></div>
        </div>

        {/* Prompt skeleton */}
        <div className="mb-8">
          <div className="h-6 bg-muted rounded w-24 mb-3"></div>
          <div className="h-4 bg-muted rounded w-full mb-2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>

        {/* Video grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="border rounded-lg overflow-hidden">
              <div className="aspect-video bg-muted"></div>
              <div className="p-3 space-y-2">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
