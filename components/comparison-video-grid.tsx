"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  TrendingDown,
  TrendingUp,
  Zap,
  Clock,
  Heart,
  X,
  CalendarClock,
  Share2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoteButton } from "@/components/vote-button";
import { formatCost } from "@/src/lib/format-cost";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
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

type SortOption =
  | "votes"
  | "latest"
  | "cheapest"
  | "expensive"
  | "fastest"
  | "slowest"
  | "az";

interface ComparisonVideoGridProps {
  videos: Video[];
}

// Helper to determine if video is vertical based on dimensions
function isVerticalVideo(video: Video): boolean {
  if (video.width && video.height) {
    return video.height > video.width;
  }
  return false;
}

// Check if we have a mix of orientations
function hasMixedOrientations(videos: Video[]): boolean {
  const hasVertical = videos.some(isVerticalVideo);
  const hasHorizontal = videos.some((v) => !isVerticalVideo(v));
  return hasVertical && hasHorizontal;
}

function VideoCard({
  video,
  onFullscreen,
  videoRef,
  globalIsPlaying,
}: {
  video: Video;
  onFullscreen: () => void;
  videoRef: (el: HTMLVideoElement | null) => void;
  globalIsPlaying: boolean;
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const isVertical = isVerticalVideo(video);
  const aspectRatio =
    video.width && video.height
      ? video.width / video.height
      : isVertical
      ? 9 / 16
      : 16 / 9;

  // Handle hover-based play/pause
  useEffect(() => {
    if (!globalIsPlaying) {
      if (isHovering && localVideoRef.current) {
        localVideoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else if (localVideoRef.current) {
        localVideoRef.current.pause();
        localVideoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }
  }, [isHovering, globalIsPlaying]);

  // Handle global play all state
  useEffect(() => {
    if (globalIsPlaying && localVideoRef.current) {
      setIsPlaying(true);
    } else if (!globalIsPlaying && !isHovering && localVideoRef.current) {
      setIsPlaying(false);
    }
  }, [globalIsPlaying, isHovering]);

  return (
    <div className="masonry-item">
      <div className="group rounded-xl overflow-hidden bg-card border hover:shadow-lg transition-shadow">
        {/* Video container */}
        <div
          className="relative cursor-pointer bg-black"
          style={{ aspectRatio }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onClick={onFullscreen}
        >
          {/* Thumbnail */}
          {video.thumbnailUrl && (
            <img
              src={video.thumbnailUrl}
              alt={video.model.name}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                isPlaying ? "opacity-0" : "opacity-100"
              }`}
            />
          )}

          {/* Video */}
          {video.url && (
            <video
              ref={(el) => {
                localVideoRef.current = el;
                videoRef(el);
              }}
              src={video.url}
              muted
              loop
              playsInline
              preload="metadata"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                isPlaying ? "opacity-100" : "opacity-0"
              }`}
            />
          )}

          {/* Play overlay */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity ${
              isHovering || globalIsPlaying ? "opacity-0" : "opacity-100"
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg backdrop-blur-sm">
              <Play
                className="w-6 h-6 text-black ml-0.5"
                fill="currentColor"
              />
            </div>
          </div>

          {/* Click to expand hint */}
          <div
            className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity ${
              isHovering ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="text-white text-sm font-medium px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm">
              Click to expand
            </span>
          </div>

          {/* Vote Button Overlay */}
          <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
            <VoteButton
              videoId={video.id}
              initialVoteCount={video.voteCount}
              showZero={false}
              variant="overlay"
            />
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
              via {video.model.provider.displayName}
            </p>
          </div>

          {/* Metrics */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {video.generationTime !== null && (
              <span title="Generation time">
                {video.generationTime.toFixed(1)}s
              </span>
            )}
            {video.cost !== null && video.cost > 0 && (
              <span title="Generation cost">{formatCost(video.cost)}</span>
            )}
            {video.createdAt && (
              <span title="Generated on">
                {new Date(video.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComparisonVideoGrid({ videos }: ComparisonVideoGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>("votes");
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [copied, setCopied] = useState(false);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  // Check for video hash on mount and open modal if found
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#video-")) {
      const videoId = hash.replace("#video-", "");
      const video = videos.find((v) => v.id === videoId);
      if (video) {
        setSelectedVideo(video);
      }
    }
  }, [videos]);

  const sortedVideos = useMemo(() => {
    const sorted = [...videos];
    switch (sortBy) {
      case "votes":
        return sorted.sort((a, b) => b.voteCount - a.voteCount);
      case "latest":
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "cheapest":
        return sorted.sort(
          (a, b) => (a.cost ?? Infinity) - (b.cost ?? Infinity)
        );
      case "expensive":
        return sorted.sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0));
      case "fastest":
        return sorted.sort(
          (a, b) =>
            (a.generationTime ?? Infinity) - (b.generationTime ?? Infinity)
        );
      case "slowest":
        return sorted.sort(
          (a, b) => (b.generationTime ?? 0) - (a.generationTime ?? 0)
        );
      case "az":
        return sorted.sort((a, b) => a.model.name.localeCompare(b.model.name));
      default:
        return sorted;
    }
  }, [videos, sortBy]);

  // Determine layout based on video orientations
  const useMasonry = hasMixedOrientations(videos);
  const allVertical = videos.every(isVerticalVideo);

  const togglePlayAll = async () => {
    if (isPlaying) {
      videoRefs.current.forEach((video) => {
        video.pause();
      });
      setIsPlaying(false);
    } else {
      // Play all videos with proper error handling
      const playPromises = Array.from(videoRefs.current.values()).map(
        async (video) => {
          video.currentTime = 0;
          try {
            await video.play();
          } catch {
            // Ignore autoplay failures (user hasn't interacted yet, etc.)
          }
        }
      );
      await Promise.all(playPromises);
      setIsPlaying(true);
    }
  };

  const openFullscreen = (video: Video) => {
    videoRefs.current.forEach((v) => v.pause());
    setIsPlaying(false);
    setSelectedVideo(video);
    setCopied(false);
    // Update URL hash for shareable link
    window.history.replaceState(null, "", `#video-${video.id}`);
  };

  const closeModal = () => {
    setSelectedVideo(null);
    setCopied(false);
    // Remove hash from URL
    window.history.replaceState(null, "", window.location.pathname);
  };

  const copyVideoLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sortOptions: {
    value: SortOption;
    label: string;
    icon?: React.ReactNode;
  }[] = [
    {
      value: "votes",
      label: "Most Voted",
      icon: <Heart className="h-3.5 w-3.5" />,
    },
    {
      value: "latest",
      label: "Latest",
      icon: <CalendarClock className="h-3.5 w-3.5" />,
    },
    {
      value: "cheapest",
      label: "Cheapest",
      icon: <TrendingDown className="h-3.5 w-3.5" />,
    },
    {
      value: "expensive",
      label: "Most Expensive",
      icon: <TrendingUp className="h-3.5 w-3.5" />,
    },
    {
      value: "fastest",
      label: "Fastest",
      icon: <Zap className="h-3.5 w-3.5" />,
    },
    {
      value: "slowest",
      label: "Slowest",
      icon: <Clock className="h-3.5 w-3.5" />,
    },
    { value: "az", label: "A → Z" },
  ];

  return (
    <div className="space-y-6">
      {/* Play All Hero Banner */}
      {videos.length > 1 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#296094] via-[#28A2DD] to-[#29C6E9]">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          </div>
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 p-6 sm:p-8">
            <div className="text-center sm:text-left text-white">
              <h3 className="font-display text-xl sm:text-2xl font-bold">
                {isPlaying ? "Now Playing!" : "Ready to compare?"}
              </h3>
              <p className="text-sm sm:text-base text-white/80 mt-1">
                {isPlaying
                  ? "Watch all models side by side"
                  : `Play all ${videos.length} videos at once`}
              </p>
            </div>
            <button
              onClick={togglePlayAll}
              className={`group relative flex items-center gap-3 rounded-full font-bold text-lg transition-all duration-300 ${
                isPlaying
                  ? "bg-white/20 hover:bg-white/30 text-white px-8 py-4"
                  : "bg-white hover:bg-white/95 text-[#296094] px-8 py-4 hover:scale-105 shadow-xl hover:shadow-2xl"
              }`}
            >
              <span
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                  isPlaying
                    ? "bg-white/20"
                    : "bg-[#28A2DD] group-hover:bg-[#296094]"
                }`}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 text-white fill-current" />
                ) : (
                  <Play className="h-5 w-5 text-white fill-current ml-0.5" />
                )}
              </span>
              {isPlaying ? "Pause All" : "Play All"}
            </button>
          </div>
        </div>
      )}

      {/* Sort Options */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground hidden sm:inline">Sort:</span>
        <div className="flex flex-wrap gap-1">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSortBy(option.value)}
              className={`px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm transition-colors flex items-center gap-1 sm:gap-1.5 ${
                sortBy === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {option.icon}
              <span className="hidden xs:inline sm:inline">{option.label}</span>
              <span className="xs:hidden sm:hidden">{option.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Video Grid */}
      {sortedVideos.length > 0 ? (
        useMasonry ? (
          // Masonry layout for mixed orientations
          <div className="masonry masonry-md-3 masonry-lg-4">
            {sortedVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onFullscreen={() => openFullscreen(video)}
                videoRef={(el) => {
                  if (el) videoRefs.current.set(video.id, el);
                }}
                globalIsPlaying={isPlaying}
              />
            ))}
          </div>
        ) : (
          // Regular grid for uniform orientations
          <div
            className={`grid gap-4 ${
              allVertical
                ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {sortedVideos.map((video) => (
              <div key={video.id} className="rounded-xl overflow-hidden bg-card border hover:shadow-lg transition-shadow">
                <VideoCardContent
                  video={video}
                  onFullscreen={() => openFullscreen(video)}
                  videoRef={(el) => {
                    if (el) videoRefs.current.set(video.id, el);
                  }}
                  globalIsPlaying={isPlaying}
                />
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="rounded-2xl bg-muted/50 p-12 text-center">
          <p className="text-muted-foreground">
            No completed videos yet for this comparison.
          </p>
        </div>
      )}

      {/* Fullscreen Video Modal */}
      <Dialog
        open={!!selectedVideo}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogPortal>
          <DialogOverlay className="bg-black/95" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-8"
            onClick={closeModal}
          >
            {selectedVideo && (
              <div
                className="relative w-full h-full flex flex-col items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Top buttons */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex gap-2">
                  {/* Share button */}
                  <button
                    onClick={copyVideoLink}
                    className="p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-2"
                    title="Copy link to video"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                        <span className="text-xs sm:text-sm text-green-400 pr-1 hidden sm:inline">
                          Copied!
                        </span>
                      </>
                    ) : (
                      <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    )}
                  </button>
                  {/* Close button */}
                  <button
                    onClick={closeModal}
                    className="p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </button>
                </div>

                {/* Video container */}
                <div
                  className={`relative ${
                    isVerticalVideo(selectedVideo)
                      ? "h-[70vh] sm:h-[80vh] md:h-[85vh] max-w-[90vw] sm:max-w-[70vw] md:max-w-[50vw]"
                      : "w-full max-w-[95vw] sm:max-w-[90vw] max-h-[70vh] sm:max-h-[80vh]"
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
                      isVerticalVideo(selectedVideo)
                        ? "h-full w-auto"
                        : "w-full h-auto"
                    } max-h-[70vh] sm:max-h-[80vh] rounded-xl`}
                  />
                </div>

                {/* Video info */}
                <div className="mt-4 sm:mt-6 text-center text-white px-4">
                  <h3 className="font-display text-lg sm:text-2xl font-bold">
                    {selectedVideo.model.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/70 mt-1">
                    via {selectedVideo.model.provider.displayName}
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mt-2 sm:mt-3 text-xs sm:text-sm text-white/60">
                    {selectedVideo.generationTime !== null && (
                      <span>{selectedVideo.generationTime.toFixed(1)}s</span>
                    )}
                    {selectedVideo.cost !== null && selectedVideo.cost > 0 && (
                      <span>{formatCost(selectedVideo.cost)}</span>
                    )}
                    {selectedVideo.width && selectedVideo.height && (
                      <span>
                        {selectedVideo.width}×{selectedVideo.height}
                      </span>
                    )}
                    {selectedVideo.createdAt && (
                      <span>
                        {new Date(selectedVideo.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
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

// VideoCardContent for regular grid layout
function VideoCardContent({
  video,
  onFullscreen,
  videoRef,
  globalIsPlaying,
}: {
  video: Video;
  onFullscreen: () => void;
  videoRef: (el: HTMLVideoElement | null) => void;
  globalIsPlaying: boolean;
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const isVertical = isVerticalVideo(video);
  const aspectRatio =
    video.width && video.height
      ? video.width / video.height
      : isVertical
      ? 9 / 16
      : 16 / 9;

  // Handle hover-based play/pause
  useEffect(() => {
    if (!globalIsPlaying) {
      if (isHovering && localVideoRef.current) {
        localVideoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else if (localVideoRef.current) {
        localVideoRef.current.pause();
        localVideoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }
  }, [isHovering, globalIsPlaying]);

  // Handle global play all state
  useEffect(() => {
    if (globalIsPlaying && localVideoRef.current) {
      setIsPlaying(true);
    } else if (!globalIsPlaying && !isHovering && localVideoRef.current) {
      setIsPlaying(false);
    }
  }, [globalIsPlaying, isHovering]);

  return (
    <>
      {/* Video container */}
      <div
        className="relative cursor-pointer bg-black"
        style={{ aspectRatio }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={onFullscreen}
      >
        {/* Thumbnail */}
        {video.thumbnailUrl && (
          <img
            src={video.thumbnailUrl}
            alt={video.model.name}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isPlaying ? "opacity-0" : "opacity-100"
            }`}
          />
        )}

        {/* Video */}
        {video.url && (
          <video
            ref={(el) => {
              localVideoRef.current = el;
              videoRef(el);
            }}
            src={video.url}
            muted
            loop
            playsInline
            preload="metadata"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isPlaying ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Play overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            isHovering || globalIsPlaying ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg backdrop-blur-sm">
            <Play className="w-6 h-6 text-black ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Click to expand hint */}
        <div
          className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity ${
            isHovering ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="text-white text-sm font-medium px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm">
            Click to expand
          </span>
        </div>

        {/* Vote Button Overlay */}
        <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
          <VoteButton
            videoId={video.id}
            initialVoteCount={video.voteCount}
            showZero={false}
            variant="overlay"
          />
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
            via {video.model.provider.displayName}
          </p>
        </div>

        {/* Metrics */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {video.generationTime !== null && (
            <span title="Generation time">
              {video.generationTime.toFixed(1)}s
            </span>
          )}
          {video.cost !== null && video.cost > 0 && (
            <span title="Generation cost">{formatCost(video.cost)}</span>
          )}
          {video.createdAt && (
            <span title="Generated on">
              {new Date(video.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
