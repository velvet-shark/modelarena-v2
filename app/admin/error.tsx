"use client";

import { ErrorView } from "@/components/error-view";

export default function AdminError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorView
      {...props}
      title="Admin error"
      message="An error occurred in the admin panel. This might be a permission issue or a system error."
      link={{ href: "/admin", label: "Admin dashboard" }}
    />
  );
}
