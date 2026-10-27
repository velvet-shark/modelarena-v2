"use client";

import { ErrorView } from "@/components/error-view";

// Missing models call notFound() and get app/not-found.tsx instead
export default function ModelError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorView
      {...props}
      title="Couldn't load models"
      message="Something went wrong while loading this page. Please try again."
      link={{ href: "/models", label: "Browse models" }}
    />
  );
}
