'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ModelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Model error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-4xl font-bold text-red-600">Model Not Found</h1>
        <p className="text-muted-foreground">
          The model you're looking for doesn't exist or couldn't be loaded.
        </p>
        {error.message && (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-mono text-left break-all">{error.message}</p>
          </div>
        )}
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            href="/models"
            className="px-4 py-2 border border-input rounded-md hover:bg-accent"
          >
            Browse Models
          </Link>
        </div>
      </div>
    </div>
  );
}
