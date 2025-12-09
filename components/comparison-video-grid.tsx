"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Play, Pause, TrendingDown, TrendingUp, Zap, Clock, ThumbsUp, Maximize2, X, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoteButton } from "@/components/vote-button";
import { VideoDeleteButton } from "@/components/video-delete-button";
import { formatCost } from "@/src/lib/format-cost";
import { Dialog, DialogPortal, DialogOverlay, DialogClose } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";

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
  createdAt: string;
  model: {
    slug: string;
    name: string;
    provider: {
      displayName: string;
    };
  };
}

type SortOption = "votes" | "latest" | "cheapest" | "expensive" | "fastest" | "slowest" | "az";

interface ComparisonVideoGridProps {
  videos: Video[];
  isAdmin: boolean;
}

// Helper to determine if video is vertical based on dimensions
function isVerticalVideo(video: Video): boolean {
  if (video.width && video.height) {
    return video.height > video.width;
  }
  return false;
}

// Helper to get aspect ratio class
function getAspectRatioClass(video: Video): string {
  if (video.width && video.height) {
    const ratio = video.width / video.height;
    if (ratio < 0.8) return "aspect-[9/16]"; // Vertical (9:16)
    if (ratio > 1.2) return "aspect-video"; // Horizontal (16:9)
    return "aspect-square"; // Square-ish (1:1)
  }
  return "aspect-video"; // Default to 16:9
}

export function ComparisonVideoGrid({ videos, isAdmin }: ComparisonVideoGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>("votes");
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  const sortedVideos = useMemo(() => {
    const sorted = [...videos];
    switch (sortBy) {
      case "votes":
        return sorted.sort((a, b) => b.voteCount - a.voteCount);
      case "latest":
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  // Check if any video is vertical to adjust grid layout
  const hasVerticalVideos = useMemo(() => videos.some(isVerticalVideo), [videos]);

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

  const openFullscreen = (video: Video) => {
    // Pause grid videos when opening fullscreen
    videoRefs.current.forEach((v) => v.pause());
    setIsPlaying(false);
    setSelectedVideo(video);
  };

  const sortOptions: {
    value: SortOption;
    label: string;
    icon?: React.ReactNode;
  }[] = [
    {
      value: "votes",
      label: "Most Voted",
      icon: <ThumbsUp className="h-3.5 w-3.5" />
    },
    {
      value: "latest",
      label: "Latest",
      icon: <CalendarClock className="h-3.5 w-3.5" />
    },
    {
      value: "cheapest",
      label: "Cheapest",
      icon: <TrendingDown className="h-3.5 w-3.5" />
    },
    {
      value: "expensive",
      label: "Most Expensive",
      icon: <TrendingUp className="h-3.5 w-3.5" />
    },
    {
      value: "fastest",
      label: "Fastest",
      icon: <Zap className="h-3.5 w-3.5" />
    },
    {
      value: "slowest",
      label: "Slowest",
      icon: <Clock className="h-3.5 w-3.5" />
    },
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
                  sortBy === option.value ? "bg-primary text-primary-foreground" : "border hover:bg-muted"
                }`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Video Grid - adjusts columns based on video orientation */}
      {sortedVideos.length > 0 ? (
        <div
          className={`grid gap-6 ${
            hasVerticalVideos
              ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {sortedVideos.map((video) => (
            <div key={video.id} className="border rounded-lg overflow-hidden bg-card">
              {/* Video Player with dynamic aspect ratio */}
              <div
                className={`${getAspectRatioClass(video)} bg-muted relative group cursor-pointer`}
                onClick={() => openFullscreen(video)}
              >
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(video.id, el);
                  }}
                  src={video.url || ""}
                  poster={video.thumbnailUrl || undefined}
                  playsInline
                  preload="metadata"
                  muted
                  className="w-full h-full object-contain bg-black"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFullscreen(video);
                  }}
                />
                {/* Fullscreen overlay button */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Maximize2 className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
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
                    via {video.model.provider.displayName} • {new Date(video.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>

                {/* Metrics */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {video.generationTime !== null && (
                    <span title="Generation time">⏱ {video.generationTime.toFixed(1)}s</span>
                  )}
                  {video.cost !== null && video.cost > 0 && (
                    <span title="Generation cost">💵 {formatCost(video.cost)}</span>
                  )}
                </div>

                {/* Vote Button */}
                <VoteButton videoId={video.id} initialVoteCount={video.voteCount} showZero={false} className="w-full" />

                {/* Admin: Delete Button */}
                {isAdmin && <VideoDeleteButton videoId={video.id} modelName={video.model.name} />}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-muted-foreground">No completed videos yet for this comparison.</p>
        </div>
      )}

      {/* Fullscreen Video Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogPortal>
          <DialogOverlay className="bg-black/95" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
            onClick={() => setSelectedVideo(null)}
          >
            {selectedVideo && (
              <div
                className="relative w-full h-full flex flex-col items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>

                {/* Video container - respects natural aspect ratio */}
                <div
                  className={`relative ${
                    isVerticalVideo(selectedVideo) ? "h-[85vh] max-w-[50vw]" : "w-full max-w-[90vw] max-h-[80vh]"
                  }`}
                >
                  <video
                    ref={modalVideoRef}
                    src={selectedVideo.url || ""}
                    poster={selectedVideo.thumbnailUrl || undefined}
                    controls
                    autoPlay
                    playsInline
                    className={`${
                      isVerticalVideo(selectedVideo) ? "h-full w-auto" : "w-full h-auto"
                    } max-h-[80vh] rounded-lg`}
                  />
                </div>

                {/* Video info below */}
                <div className="mt-4 text-center text-white">
                  <h3 className="text-xl font-semibold">{selectedVideo.model.name}</h3>
                  <p className="text-sm text-gray-300">via {selectedVideo.model.provider.displayName}</p>
                  <div className="flex justify-center gap-4 mt-2 text-sm text-gray-400">
                    {selectedVideo.generationTime !== null && <span>⏱ {selectedVideo.generationTime.toFixed(1)}s</span>}
                    {selectedVideo.cost !== null && selectedVideo.cost > 0 && (
                      <span>💵 {formatCost(selectedVideo.cost)}</span>
                    )}
                    {selectedVideo.width && selectedVideo.height && (
                      <span>
                        📐 {selectedVideo.width}×{selectedVideo.height}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
