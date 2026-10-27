"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

interface VoteButtonProps {
  videoId: string;
  initialVoteCount: number;
  className?: string;
  showZero?: boolean;
  variant?: "default" | "overlay";
}

// UI hint only; the server dedupes votes with a signed cookie
function readVoted(videoId: string): boolean {
  try {
    return localStorage.getItem(`voted_${videoId}`) !== null;
  } catch {
    return false;
  }
}

function writeVoted(videoId: string, voted: boolean) {
  try {
    if (voted) localStorage.setItem(`voted_${videoId}`, "1");
    else localStorage.removeItem(`voted_${videoId}`);
  } catch {
    // Storage blocked (private mode); state just won't persist
  }
}

export function VoteButton({
  videoId,
  initialVoteCount,
  className,
  showZero = true,
  variant = "default",
}: VoteButtonProps) {
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setHasVoted(readVoted(videoId));
  }, [videoId]);

  const handleVote = async (e: React.MouseEvent) => {
    // Cards open a lightbox on click; voting shouldn't
    e.stopPropagation();
    if (loading) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/videos/${videoId}/vote`, {
        method: hasVoted ? "DELETE" : "POST",
      });

      if (res.ok) {
        setVoteCount((prev) => prev + (hasVoted ? -1 : 1));
        setHasVoted(!hasVoted);
        writeVoted(videoId, !hasVoted);
      } else if (!hasVoted && res.status === 409) {
        // Already voted from this browser
        setHasVoted(true);
        writeVoted(videoId, true);
      } else if (hasVoted && res.status === 404) {
        // No server-side vote for this browser (e.g. cookies cleared)
        setHasVoted(false);
        writeVoted(videoId, false);
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("Vote failed:", data.error ?? res.status);
      }
    } catch (error) {
      console.error("Vote error:", error);
    } finally {
      setLoading(false);
    }
  };

  const displayCount = showZero || voteCount > 0;
  const label = hasVoted ? `Remove vote (${voteCount} votes)` : `Vote for this video (${voteCount} votes)`;

  if (variant === "overlay") {
    return (
      <button
        type="button"
        onClick={handleVote}
        disabled={loading}
        aria-label={label}
        aria-pressed={hasVoted}
        className={`group/vote flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-sm cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          hasVoted
            ? "bg-black/50 hover:bg-black/70"
            : "bg-black/50 hover:bg-red-500/90 hover:scale-105"
        } ${className}`}
      >
        <Heart
          className={`h-4 w-4 drop-shadow-md transition-colors ${
            hasVoted
              ? "text-white fill-white"
              : "text-white group-hover/vote:text-white group-hover/vote:fill-white"
          }`}
        />
        {displayCount && (
          <span className="text-white text-sm font-medium drop-shadow-md">
            {voteCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <Button
      onClick={handleVote}
      disabled={loading}
      variant={hasVoted ? "default" : "outline"}
      size="sm"
      className={className}
      aria-label={label}
      aria-pressed={hasVoted}
    >
      <Heart className={`h-4 w-4 ${displayCount ? "mr-1" : ""} ${hasVoted ? "fill-current" : ""}`} />
      {displayCount && voteCount}
    </Button>
  );
}
