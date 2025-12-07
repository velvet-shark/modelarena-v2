"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, X } from "lucide-react";

interface ComparisonSidebarProps {
  type: string;
  modelCount: number;
  prompt: string;
  sourceImage?: {
    url: string;
    width?: number | null;
    height?: number | null;
  } | null;
}

export function ComparisonSidebar({ type, modelCount, prompt, sourceImage }: ComparisonSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  return (
    <>
      {/* Mobile: Collapsible Accordion */}
      <div className="lg:hidden border rounded-lg overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
        >
          <span className="font-semibold">Comparison Details</span>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        {isOpen && (
          <div className="p-4 space-y-4 border-t">
            <SidebarContent type={type} modelCount={modelCount} prompt={prompt} sourceImage={sourceImage} onImageClick={() => setIsImageModalOpen(true)} />
          </div>
        )}
      </div>

      {/* Desktop: Fixed Sidebar */}
      <div className="hidden lg:block w-80 flex-shrink-0">
        <div className="sticky top-6 space-y-4">
          <SidebarContent type={type} modelCount={modelCount} prompt={prompt} sourceImage={sourceImage} onImageClick={() => setIsImageModalOpen(true)} />
        </div>
      </div>

      {/* Image Modal */}
      {isImageModalOpen && sourceImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsImageModalOpen(false)}
        >
          <button
            onClick={() => setIsImageModalOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X className="h-8 w-8" />
          </button>
          <Image
            src={sourceImage.url}
            alt="Source image"
            width={sourceImage.width || 1920}
            height={sourceImage.height || 1080}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function SidebarContent({
  type,
  modelCount,
  prompt,
  sourceImage,
  onImageClick
}: {
  type: string;
  modelCount: number;
  prompt: string;
  sourceImage?: { url: string; width?: number | null; height?: number | null } | null;
  onImageClick: () => void;
}) {
  return (
    <>
      {/* Source Image */}
      {sourceImage && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Source Image</h3>
          <button
            onClick={onImageClick}
            className="border rounded-lg overflow-hidden bg-muted w-full cursor-zoom-in hover:opacity-90 transition-opacity"
          >
            <Image
              src={sourceImage.url}
              alt="Source image"
              width={sourceImage.width || 320}
              height={sourceImage.height || 180}
              className="w-full h-auto object-cover"
            />
          </button>
        </div>
      )}

      {/* Type Badge */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Generation Type</h3>
        <span className="inline-block px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm font-medium capitalize">
          {type.replace("-", " → ")}
        </span>
      </div>

      {/* Model Count */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Models Compared</h3>
        <span className="text-2xl font-bold">{modelCount}</span>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Prompt</h3>
        <div className="border rounded-lg p-3 bg-muted/30 max-h-64 overflow-y-auto">
          <p className="text-sm whitespace-pre-wrap">{prompt}</p>
        </div>
      </div>
    </>
  );
}
