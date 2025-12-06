"use client";

import Link from "next/link";
import { VoteButton } from "@/components/vote-button";
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

export function ModelVideoGrid({ videos }: ModelVideoGridProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map((video) => (
        <div key={video.id} className="border rounded-lg overflow-hidden">
          <Link href={`/comparisons/${video.comparison.slug}`}>
            <div className="aspect-video bg-muted relative group cursor-pointer">
              <video
                src={video.url || ""}
                poster={video.thumbnailUrl || undefined}
                className="w-full h-full object-cover"
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
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm">View Comparison</span>
              </div>
            </div>
          </Link>
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
              {video.cost !== null && (
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
  );
}
