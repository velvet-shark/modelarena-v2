"use client";

import { useHoverPlay } from "@/hooks/use-hover-play";
import Link from "next/link";

interface Video {
  id: string;
  url: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  voteCount: number;
  comparison: {
    slug: string;
    title: string;
  };
  model: {
    name: string;
    slug: string;
  };
}

interface HomeMasonryGalleryProps {
  videos: Video[];
}

function VideoCard({ video }: { video: Video }) {
  const { videoRef, isHovering, showVideo: isPlaying, hoverProps, onPlaying } =
    useHoverPlay();

  // Calculate aspect ratio for the card
  const isVertical = video.height && video.width ? video.height > video.width : false;
  const aspectRatio =
    video.width && video.height
      ? video.width / video.height
      : isVertical
      ? 9 / 16
      : 16 / 9;

  return (
    <Link
      href={`/comparisons/${video.comparison.slug}`}
      className="group block masonry-item"
      {...hoverProps}
    >
      <div
        className="relative overflow-hidden rounded-xl bg-muted"
        style={{ aspectRatio }}
      >
        {/* Thumbnail */}
        {video.thumbnailUrl && (
          <img
            src={video.thumbnailUrl}
            loading="lazy"
            decoding="async"
            alt={video.model.name}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isPlaying ? "opacity-0" : "opacity-100"
            }`}
          />
        )}

        {/* Video (hidden until hover) */}
        {video.url && (
          <video
            ref={videoRef}
            src={video.url}
            muted
            loop
            playsInline
            onPlaying={onPlaying}
            preload="none"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isPlaying ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Model name overlay (shown on hover) */}
        <div
          className={`absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity ${
            isHovering ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-white text-sm font-medium">{video.model.name}</p>
          <p className="text-white/70 text-xs truncate">{video.comparison.title}</p>
        </div>
      </div>
    </Link>
  );
}

export function HomeMasonryGallery({ videos }: HomeMasonryGalleryProps) {
  // The server already limits and orders the list
  return (
    <div className="px-4 sm:px-6">
      <div className="masonry masonry-md-3 masonry-lg-4 masonry-xl-5">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
