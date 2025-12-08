"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { VoteButton } from "@/components/vote-button";
import { formatCost } from "@/src/lib/format-cost";
import { X, Maximize2 } from "lucide-react";
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
  comparison: {
    slug: string;
    title: string;
    description: string | null;
    prompt: string;
  };
}

interface ModelVideoGridProps {
  videos: Video[];
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

export function ModelVideoGrid({ videos }: ModelVideoGridProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  // Check if any video is vertical to adjust grid layout
  const hasVerticalVideos = useMemo(
    () => videos.some(isVerticalVideo),
    [videos]
  );

  if (videos.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">
          No public videos yet for this model.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={`grid gap-6 ${
          hasVerticalVideos
            ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }`}
      >
        {videos.map((video) => (
          <div key={video.id} className="border rounded-lg overflow-hidden">
            <div
              className={`${getAspectRatioClass(video)} bg-muted relative group cursor-pointer`}
              onClick={() => setSelectedVideo(video)}
            >
              <video
                src={video.url || ""}
                poster={video.thumbnailUrl || undefined}
                className="w-full h-full object-contain bg-black"
                muted
                playsInline
                onMouseEnter={(e) => {
                  const target = e.target as HTMLVideoElement;
                  target.play().catch(() => {});
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLVideoElement;
                  target.pause();
                  target.currentTime = 0;
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </div>
            <div className="p-4 space-y-2">
              <Link
                href={`/comparisons/${video.comparison.slug}`}
                className="font-medium text-sm hover:text-primary transition-colors line-clamp-2"
              >
                {video.comparison.title}
              </Link>
              <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                {video.generationTime && (
                  <span title="Generation time">
                    ⏱ {video.generationTime.toFixed(1)}s
                  </span>
                )}
                {video.duration && (
                  <span title="Video duration">
                    📹 {video.duration.toFixed(1)}s
                  </span>
                )}
                {video.width && video.height && (
                  <span title="Resolution">
                    📐 {video.width}×{video.height}
                  </span>
                )}
                {video.cost !== null && video.cost > 0 && (
                  <span title="Generation cost">
                    💵 {formatCost(video.cost)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {video.comparison.description || video.comparison.prompt}
              </p>
              <VoteButton
                videoId={video.id}
                initialVoteCount={video.voteCount}
                className="w-full mt-2"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Video Modal */}
      <Dialog
        open={!!selectedVideo}
        onOpenChange={(open) => !open && setSelectedVideo(null)}
      >
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
                    isVerticalVideo(selectedVideo)
                      ? "h-[85vh] max-w-[50vw]"
                      : "w-full max-w-[90vw] max-h-[80vh]"
                  }`}
                >
                  <video
                    src={selectedVideo.url || ""}
                    poster={selectedVideo.thumbnailUrl || undefined}
                    controls
                    autoPlay
                    playsInline
                    className={`${
                      isVerticalVideo(selectedVideo)
                        ? "h-full w-auto"
                        : "w-full h-auto"
                    } max-h-[80vh] rounded-lg`}
                  />
                </div>

                {/* Video info below */}
                <div className="mt-4 text-center text-white">
                  <Link
                    href={`/comparisons/${selectedVideo.comparison.slug}`}
                    className="text-xl font-semibold hover:underline"
                  >
                    {selectedVideo.comparison.title}
                  </Link>
                  <div className="flex justify-center gap-4 mt-2 text-sm text-gray-400">
                    {selectedVideo.generationTime !== null && (
                      <span>⏱ {selectedVideo.generationTime.toFixed(1)}s</span>
                    )}
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
    </>
  );
}
