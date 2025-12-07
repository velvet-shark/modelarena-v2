"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface VideoDeleteButtonProps {
  videoId: string;
  modelName: string;
}

export function VideoDeleteButton({ videoId, modelName }: VideoDeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete the video for ${modelName}? This will permanently remove the video file, thumbnail, and database record. This cannot be undone.`
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }

      // Refresh the page to show updated list
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleDelete}
        size="sm"
        variant="destructive"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Deleting..." : "Delete"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
