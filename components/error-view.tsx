"use client";

import { useEffect } from "react";
import Link from "next/link";

// Shared body for the route error boundaries (app/**/error.tsx)
export function ErrorView({
  error,
  reset,
  title,
  message,
  link,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  message: string;
  link: { href: string; label: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-4xl font-bold text-red-600">{title}</h1>
        <p className="text-muted-foreground">{message}</p>
        {/* Production hides server error messages; the digest matches the server log */}
        {process.env.NODE_ENV === "development" && error.message ? (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-mono text-left break-all">{error.message}</p>
          </div>
        ) : (
          error.digest && (
            <p className="text-xs text-muted-foreground font-mono">Error ID: {error.digest}</p>
          )
        )}
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try again
          </button>
          <Link href={link.href} className="px-4 py-2 border border-input rounded-md hover:bg-accent">
            {link.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
