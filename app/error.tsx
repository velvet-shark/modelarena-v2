'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-4xl font-bold text-red-600">Something went wrong</h1>
        <p className="text-muted-foreground">
          An unexpected error occurred. Please try again or return to the homepage.
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
            href="/"
            className="px-4 py-2 border border-input rounded-md hover:bg-accent"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
