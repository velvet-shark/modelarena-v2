"use client";

import { ErrorView } from "@/components/error-view";

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorView
      {...props}
      title="Something went wrong"
      message="An unexpected error occurred. Please try again or return to the homepage."
      link={{ href: "/", label: "Go home" }}
    />
  );
}
