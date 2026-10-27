"use client";

import { useRef, useState } from "react";

// Hover-to-preview for video cards.
//
// `showVideo` turns on only once the video is rendering frames (onPlaying),
// so the thumbnail doesn't fade to a black box while the video buffers. It
// turns off when the hover ends and the video rewinds. A parent "Play All"
// (`externallyPlaying`) owns playback: hover leaves those videos alone, and
// pausing them keeps the paused frame on screen instead of rewinding.
export function useHoverPlay(externallyPlaying = false) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const onMouseEnter = () => {
    setIsHovering(true);
    if (!externallyPlaying) videoRef.current?.play().catch(() => {});
  };

  const onMouseLeave = () => {
    setIsHovering(false);
    const video = videoRef.current;
    if (!video || externallyPlaying) return;
    video.pause();
    video.currentTime = 0;
    setShowVideo(false);
  };

  return {
    videoRef,
    isHovering,
    showVideo,
    hoverProps: { onMouseEnter, onMouseLeave },
    onPlaying: () => setShowVideo(true),
  };
}
