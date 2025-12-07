"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Play, Pause, TrendingDown, TrendingUp, Zap, Clock, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoteButton } from "@/components/vote-button";
import { VideoDeleteButton } from "@/components/video-delete-button";
import { formatCost } from "@/src/lib/format-cost";

interface Video {
  id: string;
  url: string | null;
  thumbnailUrl: string | null;
  generationTime: number | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  cost: number | null;
  voteCount: number;
  model: {
    slug: string;
    name: string;
    provider: {
      displayName: string;
    };
  };
}

type SortOption = "votes" | "cheapest" | "expensive" | "fastest" | "slowest" | "az";

interface ComparisonVideoGridProps {
  videos: Video[];
  isAdmin: boolean;
}

export function ComparisonVideoGrid({ videos, isAdmin }: ComparisonVideoGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>("votes");
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const sortedVideos = useMemo(() => {
    const sorted = [...videos];
    switch (sortBy) {
      case "votes":
        return sorted.sort((a, b) => b.voteCount - a.voteCount);
      case "cheapest":
        return sorted.sort((a, b) => (a.cost ?? Infinity) - (b.cost ?? Infinity));
      case "expensive":
        return sorted.sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0));
      case "fastest":
        return sorted.sort((a, b) => (a.generationTime ?? Infinity) - (b.generationTime ?? Infinity));
      case "slowest":
        return sorted.sort((a, b) => (b.generationTime ?? 0) - (a.generationTime ?? 0));
      case "az":
        return sorted.sort((a, b) => a.model.name.localeCompare(b.model.name));
      default:
        return sorted;
    }
  }, [videos, sortBy]);

  const togglePlayAll = () => {
    if (isPlaying) {
      videoRefs.current.forEach((video) => {
        video.pause();
      });
      setIsPlaying(false);
    } else {
      videoRefs.current.forEach((video) => {
        video.currentTime = 0;
        video.play().catch(() => {});
      });
      setIsPlaying(true);
    }
  };

  const sortOptions: { value: SortOption; label: string; icon?: React.ReactNode }[] = [
    { value: "votes", label: "Most Voted", icon: <ThumbsUp className="h-3.5 w-3.5" /> },
    { value: "cheapest", label: "Cheapest", icon: <TrendingDown className="h-3.5 w-3.5" /> },
    { value: "expensive", label: "Most Expensive", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { value: "fastest", label: "Fastest", icon: <Zap className="h-3.5 w-3.5" /> },
    { value: "slowest", label: "Slowest", icon: <Clock className="h-3.5 w-3.5" /> },
    { value: "az", label: "A → Z" }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Play All and Sort */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Play/Pause All Button */}
        {videos.length > 1 && (
          <Button
            onClick={togglePlayAll}
            size="lg"
            className="rounded-full h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
          >
            {isPlaying ? (
              <>
                <Pause className="h-6 w-6 mr-2 fill-current" />
                Pause All
              </>
            ) : (
              <>
                <Play className="h-6 w-6 mr-2 fill-current" />
                Play All
              </>
            )}
          </Button>
        )}

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort:</span>
          <div className="flex flex-wrap gap-1">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  sortBy === option.value
                    ? "bg-primary text-primary-foreground"
                    : "border hover:bg-muted"
                }`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Video Grid - 3 per row on desktop */}
      {sortedVideos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedVideos.map((video) => (
            <div key={video.id} className="border rounded-lg overflow-hidden bg-card">
              {/* Video Player */}
              <div className="aspect-video bg-muted relative">
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(video.id, el);
                  }}
                  src={video.url || ""}
                  poster={video.thumbnailUrl || undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Video Info */}
              <div className="p-4 space-y-3">
                {/* Model Name & Provider */}
                <div>
                  <Link
                    href={`/models/${video.model.slug}`}
                    className="font-semibold hover:text-primary transition-colors block"
                  >
                    {video.model.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    via {video.model.provider.displayName}
                  </p>
                </div>

                {/* Metrics */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {video.generationTime !== null && (
                    <span title="Generation time">⏱ {video.generationTime.toFixed(1)}s</span>
                  )}
                  {video.cost !== null && (
                    <span title="Generation cost">💵 {formatCost(video.cost)}</span>
                  )}
                </div>

                {/* Vote Button */}
                <VoteButton
                  videoId={video.id}
                  initialVoteCount={video.voteCount}
                  showZero={false}
                  className="w-full"
                />

                {/* Admin: Delete Button */}
                {isAdmin && (
                  <VideoDeleteButton videoId={video.id} modelName={video.model.name} />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-muted-foreground">No completed videos yet for this comparison.</p>
        </div>
      )}
    </div>
  );
}
