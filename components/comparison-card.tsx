"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ThumbsUp } from "lucide-react";

interface ComparisonCardProps {
  comparison: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    type: string;
    totalVotes: number;
    isFeatured: boolean;
    sourceImage: {
      url: string;
    } | null;
    videos: Array<{
      id: string;
      url: string | null;
      thumbnailUrl: string | null;
      width: number | null;
      height: number | null;
      status: string;
    }>;
    tags: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
  };
}

export function ComparisonCard({ comparison }: ComparisonCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get the first completed video for preview
  const previewVideo = comparison.videos[0];
  const completedCount = comparison.videos.filter(
    (v) => v.status === "COMPLETED"
  ).length;

  // Calculate aspect ratio from the first video
  const isVertical =
    previewVideo?.height && previewVideo?.width
      ? previewVideo.height > previewVideo.width
      : false;
  const aspectRatio =
    previewVideo?.width && previewVideo?.height
      ? previewVideo.width / previewVideo.height
      : isVertical
      ? 9 / 16
      : 16 / 9;

  useEffect(() => {
    if (isHovering && videoRef.current && previewVideo?.url) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isHovering, previewVideo?.url]);

  const thumbnailUrl =
    previewVideo?.thumbnailUrl || comparison.sourceImage?.url;

  return (
    <div className="masonry-item">
      <Link
        href={`/comparisons/${comparison.slug}`}
        className="group block rounded-xl overflow-hidden bg-card border hover:shadow-lg transition-shadow"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Media Container */}
        <div
          className="relative bg-muted"
          style={{ aspectRatio }}
        >
          {/* Thumbnail */}
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={comparison.title}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                isPlaying ? "opacity-0" : "opacity-100"
              }`}
            />
          )}

          {/* Video preview */}
          {previewVideo?.url && (
            <video
              ref={videoRef}
              src={previewVideo.url}
              muted
              loop
              playsInline
              preload="none"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                isPlaying ? "opacity-100" : "opacity-0"
              }`}
            />
          )}

          {/* No preview fallback */}
          {!thumbnailUrl && !previewVideo?.url && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No preview</span>
            </div>
          )}

          {/* Model count badge */}
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-medium backdrop-blur-sm">
              {completedCount} model{completedCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
            {comparison.title}
          </h3>

          {comparison.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {comparison.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="capitalize">
                {comparison.type.replace("-", " ")}
              </span>
            </div>

            {comparison.totalVotes > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{comparison.totalVotes}</span>
              </div>
            )}
          </div>

          {comparison.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap pt-1">
              {comparison.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="text-xs bg-muted px-2 py-0.5 rounded-full"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
