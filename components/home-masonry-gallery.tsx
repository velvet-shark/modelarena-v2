"use client";

import { useState, useRef, useEffect } from "react";
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
  const [isHovering, setIsHovering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Calculate aspect ratio for the card
  const isVertical = video.height && video.width ? video.height > video.width : false;
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
    <Link
      href={`/comparisons/${video.comparison.slug}`}
      className="group block masonry-item"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div
        className="relative overflow-hidden rounded-xl bg-muted"
        style={{ aspectRatio }}
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

        {/* Video (hidden until hover) */}
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
  // Sort videos to create a balanced masonry layout
  // Alternate between vertical and horizontal for visual interest
  const sortedVideos = [...videos].slice(0, 24); // Limit to 24 for homepage

  return (
    <div className="px-4">
      <div className="masonry masonry-md-3 masonry-lg-4 masonry-xl-5">
        {sortedVideos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
