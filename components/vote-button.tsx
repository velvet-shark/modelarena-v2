"use client";

import { useState, useEffect } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { Button } from "@/components/ui/button";
import { ThumbsUp } from "lucide-react";

interface VoteButtonProps {
  videoId: string;
  initialVoteCount: number;
  className?: string;
}

export function VoteButton({
  videoId,
  initialVoteCount,
  className,
}: VoteButtonProps) {
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [hasVoted, setHasVoted] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get browser fingerprint
    const getFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setFingerprint(result.visitorId);

        // Check if already voted (stored in localStorage)
        const voted = localStorage.getItem(`voted_${videoId}`);
        if (voted === result.visitorId) {
          setHasVoted(true);
        }
      } catch (error) {
        console.error("Fingerprint error:", error);
      }
    };

    getFingerprint();
  }, [videoId]);

  const handleVote = async () => {
    if (!fingerprint || loading) return;

    setLoading(true);

    try {
      if (hasVoted) {
        // Remove vote
        const res = await fetch(`/api/videos/${videoId}/vote`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint }),
        });

        if (res.ok) {
          setHasVoted(false);
          setVoteCount((prev) => prev - 1);
          localStorage.removeItem(`voted_${videoId}`);
        } else {
          const data = await res.json();
          console.error("Unvote failed:", data.error);
        }
      } else {
        // Add vote
        const res = await fetch(`/api/videos/${videoId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint }),
        });

        if (res.ok) {
          setHasVoted(true);
          setVoteCount((prev) => prev + 1);
          localStorage.setItem(`voted_${videoId}`, fingerprint);
        } else {
          const data = await res.json();
          if (data.error === "Already voted for this video") {
            setHasVoted(true);
            localStorage.setItem(`voted_${videoId}`, fingerprint);
          } else {
            console.error("Vote failed:", data.error);
          }
        }
      }
    } catch (error) {
      console.error("Vote error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleVote}
      disabled={!fingerprint || loading}
      variant={hasVoted ? "default" : "outline"}
      size="sm"
      className={className}
    >
      <ThumbsUp className={`h-4 w-4 mr-1 ${hasVoted ? "fill-current" : ""}`} />
      {voteCount}
    </Button>
  );
}
