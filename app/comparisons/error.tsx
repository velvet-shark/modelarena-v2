"use client";

import { ErrorView } from "@/components/error-view";

// Missing comparisons call notFound() and get app/not-found.tsx instead
export default function ComparisonError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorView
      {...props}
      title="Couldn't load comparisons"
      message="Something went wrong while loading this page. Please try again."
      link={{ href: "/comparisons", label: "Browse comparisons" }}
    />
  );
}
