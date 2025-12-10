"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { Play, X } from "lucide-react";
import { VoteButton } from "@/components/vote-button";
import { formatCost } from "@/src/lib/format-cost";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
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

function isVerticalVideo(video: Video): boolean {
  if (video.width && video.height) {
    return video.height > video.width;
  }
  return false;
}

function hasMixedOrientations(videos: Video[]): boolean {
  const hasVertical = videos.some(isVerticalVideo);
  const hasHorizontal = videos.some((v) => !isVerticalVideo(v));
  return hasVertical && hasHorizontal;
}

function VideoCard({
  video,
  onFullscreen,
}: {
  video: Video;
  onFullscreen: () => void;
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVertical = isVerticalVideo(video);
  const aspectRatio =
    video.width && video.height
      ? video.width / video.height
      : isVertical
      ? 9 / 16
      : 16 / 9;

  useEffect(() => {
    if (isHovering && videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isHovering]);

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
              alt={video.comparison.title}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                isPlaying ? "opacity-0" : "opacity-100"
              }`}
            />
          )}

          {/* Video */}
          {video.url && (
            <video
              ref={videoRef}
              src={video.url}
              muted
              loop
              playsInline
              preload="none"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                isPlaying ? "opacity-100" : "opacity-0"
              }`}
            />
          )}

          {/* Play overlay */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity ${
              isHovering ? "opacity-0" : "opacity-100"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg backdrop-blur-sm">
              <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
            </div>
          </div>

          {/* Expand hint */}
          <div
            className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity ${
              isHovering ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="text-white text-sm font-medium px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm">
              Click to expand
            </span>
          </div>
        </div>

        {/* Video Info */}
        <div className="p-4 space-y-3">
          <Link
            href={`/comparisons/${video.comparison.slug}`}
            className="font-semibold text-sm hover:text-primary transition-colors line-clamp-2 block"
          >
            {video.comparison.title}
          </Link>

          <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
            {video.generationTime && (
              <span>{video.generationTime.toFixed(1)}s</span>
            )}
            {video.cost !== null && video.cost > 0 && (
              <span>{formatCost(video.cost)}</span>
            )}
            {video.width && video.height && (
              <span>
                {video.width}×{video.height}
              </span>
            )}
          </div>

          <VoteButton
            videoId={video.id}
            initialVoteCount={video.voteCount}
            showZero={false}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

export function ModelVideoGrid({ videos }: ModelVideoGridProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const useMasonry = hasMixedOrientations(videos);
  const allVertical = videos.every(isVerticalVideo);

  if (videos.length === 0) {
    return (
      <div className="rounded-2xl bg-muted/50 p-12 text-center">
        <p className="text-muted-foreground">
          No public videos yet for this model.
        </p>
      </div>
    );
  }

  return (
    <>
      {useMasonry ? (
        <div className="masonry masonry-md-3 masonry-lg-4">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onFullscreen={() => setSelectedVideo(video)}
            />
          ))}
        </div>
      ) : (
        <div
          className={`grid gap-4 ${
            allVertical
              ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }`}
        >
          {videos.map((video) => (
            <VideoCardGrid
              key={video.id}
              video={video}
              onFullscreen={() => setSelectedVideo(video)}
            />
          ))}
        </div>
      )}

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
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>

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
                    } max-h-[80vh] rounded-xl`}
                  />
                </div>

                <div className="mt-6 text-center text-white">
                  <Link
                    href={`/comparisons/${selectedVideo.comparison.slug}`}
                    className="font-display text-2xl font-bold hover:underline"
                  >
                    {selectedVideo.comparison.title}
                  </Link>
                  <div className="flex justify-center gap-6 mt-3 text-sm text-white/60">
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

function VideoCardGrid({
  video,
  onFullscreen,
}: {
  video: Video;
  onFullscreen: () => void;
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVertical = isVerticalVideo(video);
  const aspectRatio =
    video.width && video.height
      ? video.width / video.height
      : isVertical
      ? 9 / 16
      : 16 / 9;

  useEffect(() => {
    if (isHovering && videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isHovering]);

  return (
    <div className="group rounded-xl overflow-hidden bg-card border hover:shadow-lg transition-shadow">
      <div
        className="relative cursor-pointer bg-black"
        style={{ aspectRatio }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={onFullscreen}
      >
        {video.thumbnailUrl && (
          <img
            src={video.thumbnailUrl}
            alt={video.comparison.title}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isPlaying ? "opacity-0" : "opacity-100"
            }`}
          />
        )}

        {video.url && (
          <video
            ref={videoRef}
            src={video.url}
            muted
            loop
            playsInline
            preload="none"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isPlaying ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            isHovering ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg backdrop-blur-sm">
            <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
          </div>
        </div>

        <div
          className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity ${
            isHovering ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="text-white text-sm font-medium px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm">
            Click to expand
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <Link
          href={`/comparisons/${video.comparison.slug}`}
          className="font-semibold text-sm hover:text-primary transition-colors line-clamp-2 block"
        >
          {video.comparison.title}
        </Link>

        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
          {video.generationTime && (
            <span>{video.generationTime.toFixed(1)}s</span>
          )}
          {video.cost !== null && video.cost > 0 && (
            <span>{formatCost(video.cost)}</span>
          )}
          {video.width && video.height && (
            <span>
              {video.width}×{video.height}
            </span>
          )}
        </div>

        <VoteButton
          videoId={video.id}
          initialVoteCount={video.voteCount}
          showZero={false}
          className="w-full"
        />
      </div>
    </div>
  );
}
