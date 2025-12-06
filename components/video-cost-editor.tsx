"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCost } from "@/src/lib/format-cost";

interface VideoCostEditorProps {
  videoId: string;
  currentCost: number | null;
}

export function VideoCostEditor({
  videoId,
  currentCost,
}: VideoCostEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cost, setCost] = useState(
    currentCost !== null ? currentCost.toString() : ""
  );

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cost: cost === "" ? null : parseFloat(cost),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update");
      }

      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCost(currentCost !== null ? currentCost.toString() : "");
    setEditing(false);
    setError(null);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        💵 {formatCost(currentCost)}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        <Input
          type="number"
          step="0.0001"
          placeholder="Cost"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="h-6 text-xs w-20"
          disabled={loading}
        />
        <Button
          onClick={handleSave}
          size="sm"
          className="h-6 px-2 text-xs"
          disabled={loading}
        >
          ✓
        </Button>
        <Button
          onClick={handleCancel}
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          disabled={loading}
        >
          ✕
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
