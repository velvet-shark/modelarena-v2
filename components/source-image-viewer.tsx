"use client";

import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Maximize2 } from "lucide-react";

interface SourceImageViewerProps {
  url: string;
  width: number | null;
  height: number | null;
  alt?: string;
}

export function SourceImageViewer({ url, width, height, alt = "Source" }: SourceImageViewerProps) {
  // Extract file format from URL
  const format = url.split('.').pop()?.toUpperCase() || 'UNKNOWN';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="relative max-w-2xl mx-auto cursor-pointer group">
          <Image
            src={url}
            alt={alt}
            width={width || 800}
            height={height || 600}
            className="rounded object-contain w-full h-auto max-h-96"
            priority
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-3">
              <Maximize2 className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-0 border-0 bg-black/95" aria-describedby="source-image-desc">
        <DialogTitle className="sr-only">Source Image Preview</DialogTitle>
        <DialogDescription id="source-image-desc" className="sr-only">
          Full-size view of the source image
        </DialogDescription>
        <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
          {/* Original image without Next.js optimization */}
          <img
            src={url}
            alt={alt}
            className="object-contain max-h-[85vh] w-auto h-auto"
          />
          {/* Image info */}
          {(width || height) && (
            <div className="mt-4 text-sm text-white/80">
              Original: {width}×{height}px • {format}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
