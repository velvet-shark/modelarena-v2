export default function ModelsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="h-10 bg-muted rounded w-48 mb-8"></div>

        {/* Provider sections skeleton */}
        {[...Array(3)].map((_, providerIdx) => (
          <div key={providerIdx} className="mb-12">
            <div className="h-8 bg-muted rounded w-32 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, modelIdx) => (
                <div key={modelIdx} className="border rounded-lg p-4">
                  <div className="h-6 bg-muted rounded w-3/4 mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
