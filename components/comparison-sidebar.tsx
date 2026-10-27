"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { formatCost } from "@/src/lib/format-cost";

const formatCredits = (credits: number) =>
  credits.toLocaleString("en-US", { maximumFractionDigits: 1 });

interface ComparisonSidebarProps {
  type: string;
  modelCount: number;
  prompt: string;
  totalCost: number;
  avgCost: number;
  avgGenTime: number | null;
  // Present when the clips were paid in platform credits instead of dollars
  totalCredits?: number | null;
  avgCredits?: number | null;
  sourceImage?: {
    url: string;
    width?: number | null;
    height?: number | null;
  } | null;
}

export function ComparisonSidebar({
  type,
  modelCount,
  prompt,
  totalCost,
  avgCost,
  avgGenTime,
  totalCredits,
  avgCredits,
  sourceImage
}: ComparisonSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  return (
    <>
      {/* Mobile: Collapsible Accordion */}
      <div className="lg:hidden rounded-xl border bg-card overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold">Details</span>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        {isOpen && (
          <div className="p-4 pt-0 space-y-5">
            <SidebarContent
              type={type}
              modelCount={modelCount}
              prompt={prompt}
              totalCost={totalCost}
              avgCost={avgCost}
              avgGenTime={avgGenTime}
              totalCredits={totalCredits}
              avgCredits={avgCredits}
              sourceImage={sourceImage}
              onImageClick={() => setIsImageModalOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Desktop: Fixed Sidebar */}
      <div className="hidden lg:block w-80 flex-shrink-0">
        <div className="sticky top-24 space-y-5">
          <SidebarContent
            type={type}
            modelCount={modelCount}
            prompt={prompt}
            totalCost={totalCost}
            avgCost={avgCost}
            avgGenTime={avgGenTime}
            totalCredits={totalCredits}
            avgCredits={avgCredits}
            sourceImage={sourceImage}
            onImageClick={() => setIsImageModalOpen(true)}
          />
        </div>
      </div>

      {/* Image Modal */}
      {sourceImage && (
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogPortal>
            <DialogOverlay className="bg-black/90" />
            <DialogPrimitive.Content
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setIsImageModalOpen(false)}
              aria-describedby={undefined}
            >
              <DialogPrimitive.Title className="sr-only">Source image</DialogPrimitive.Title>
              <DialogPrimitive.Close
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Close"
              >
                <X className="h-6 w-6 text-white" />
              </DialogPrimitive.Close>
              <Image
                src={sourceImage.url}
                alt="Source image"
                width={sourceImage.width || 1920}
                height={sourceImage.height || 1080}
                className="max-w-full max-h-[90vh] object-contain rounded-xl"
                onClick={(e) => e.stopPropagation()}
              />
            </DialogPrimitive.Content>
          </DialogPortal>
        </Dialog>
      )}
    </>
  );
}

function SidebarContent({
  type,
  modelCount,
  prompt,
  totalCost,
  avgCost,
  avgGenTime,
  totalCredits,
  avgCredits,
  sourceImage,
  onImageClick
}: {
  type: string;
  modelCount: number;
  prompt: string;
  totalCost: number;
  avgCost: number;
  avgGenTime: number | null;
  totalCredits?: number | null;
  avgCredits?: number | null;
  sourceImage?: {
    url: string;
    width?: number | null;
    height?: number | null;
  } | null;
  onImageClick: () => void;
}) {
  return (
    <>
      {/* Source Image */}
      {sourceImage && (
        <div className="b-0">
          <button
            onClick={onImageClick}
            className="rounded-xl overflow-hidden w-full cursor-zoom-in hover:opacity-90 transition-opacity"
          >
            <Image
              src={sourceImage.url}
              alt="Source image"
              width={sourceImage.width || 320}
              height={sourceImage.height || 180}
              className="w-full h-auto object-cover"
            />
          </button>
          <h3 className="text-sm font-medium text-muted-foreground">Source Image</h3>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-xl bg-muted/50 p-3 sm:p-4">
          <div className="text-xs text-muted-foreground">Models</div>
          <div className="font-display text-xl sm:text-2xl font-bold mt-1">{modelCount}</div>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 sm:p-4">
          <div className="text-xs text-muted-foreground">Avg Time</div>
          <div className="font-display text-xl sm:text-2xl font-bold mt-1">
            {avgGenTime === null ? "N/A" : `${avgGenTime.toFixed(0)}s`}
          </div>
        </div>
        {totalCredits != null ? (
          <>
            <div className="rounded-xl bg-muted/50 p-3 sm:p-4">
              <div className="text-xs text-muted-foreground">Total Credits</div>
              <div className="font-display text-xl sm:text-2xl font-bold mt-1">{formatCredits(totalCredits)}</div>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 sm:p-4">
              <div className="text-xs text-muted-foreground">Avg Credits</div>
              <div className="font-display text-xl sm:text-2xl font-bold mt-1">{formatCredits(avgCredits ?? 0)}</div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl bg-muted/50 p-3 sm:p-4">
              <div className="text-xs text-muted-foreground">Total Cost</div>
              <div className="font-display text-xl sm:text-2xl font-bold mt-1">{formatCost(totalCost)}</div>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 sm:p-4">
              <div className="text-xs text-muted-foreground">Avg Cost</div>
              <div className="font-display text-xl sm:text-2xl font-bold mt-1">{formatCost(avgCost)}</div>
            </div>
          </>
        )}
      </div>

      {/* Type Badge */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Type</h3>
        <span className="inline-block px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium capitalize">
          {type.replace("-", " → ")}
        </span>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Prompt</h3>
        <blockquote className="relative pl-4 border-l-2 border-[#28A2DD]">
          <span className="absolute left-2 -top-2 text-4xl text-[#28A2DD]/30 font-serif">&ldquo;</span>
          <p className="text-sm whitespace-pre-wrap leading-relaxed italic text-foreground/90 pt-2">{prompt}</p>
        </blockquote>
      </div>
    </>
  );
}
