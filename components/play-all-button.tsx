"use client";

import { Button } from "@/components/ui/button";

export function PlayAllButton() {
  const handlePlayAll = () => {
    const videos = document.querySelectorAll("video");
    videos.forEach((video) => {
      video.currentTime = 0;
      video.play().catch((error) => {
        console.warn("Could not auto-play video:", error);
      });
    });
  };

  return (
    <Button onClick={handlePlayAll} size="lg">
      ▶ Play All Videos
    </Button>
  );
}
