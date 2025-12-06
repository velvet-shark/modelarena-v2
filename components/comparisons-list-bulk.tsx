"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Video {
  id: string;
  status: string;
}

interface Comparison {
  id: string;
  title: string;
  description: string | null;
  type: string;
  prompt: string;
  isPublic: boolean;
  isFeatured: boolean;
  createdAt: Date;
  sourceImage: {
    url: string;
  } | null;
  videos: Video[];
  _count: {
    videos: number;
  };
}

interface ComparisonsListBulkProps {
  comparisons: Comparison[];
}

export function ComparisonsListBulk({
  comparisons,
}: ComparisonsListBulkProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter comparisons
  const filteredComparisons = useMemo(() => {
    return comparisons.filter((comp) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          comp.title.toLowerCase().includes(query) ||
          comp.prompt.toLowerCase().includes(query) ||
          comp.description?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Type filter
      if (typeFilter !== "all" && comp.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "public" && !comp.isPublic) return false;
        if (statusFilter === "private" && comp.isPublic) return false;
        if (statusFilter === "featured" && !comp.isFeatured) return false;
      }

      return true;
    });
  }, [comparisons, searchQuery, typeFilter, statusFilter]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    if (selected.size === filteredComparisons.length && filteredComparisons.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredComparisons.map((c) => c.id)));
    }
  };

  const bulkUpdate = async (updates: {
    isPublic?: boolean;
    isFeatured?: boolean;
  }) => {
    if (selected.size === 0) {
      alert("No comparisons selected");
      return;
    }

    setLoading(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/comparisons/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          })
        )
      );

      router.refresh();
      setSelected(new Set());
    } catch (error) {
      alert("Failed to update comparisons");
    } finally {
      setLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) {
      alert("No comparisons selected");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selected.size} comparison(s)? This cannot be undone.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/comparisons/${id}`, {
            method: "DELETE",
          })
        )
      );

      router.refresh();
      setSelected(new Set());
    } catch (error) {
      alert("Failed to delete comparisons");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <Input
              placeholder="Search by title, prompt, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image-to-video">Image to Video</SelectItem>
                <SelectItem value="text-to-video">Text to Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredComparisons.length} of {comparisons.length} comparisons
        </div>
      </div>

      {selected.size > 0 && (
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {selected.size} selected
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkUpdate({ isPublic: true })}
                disabled={loading}
              >
                Publish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkUpdate({ isPublic: false })}
                disabled={loading}
              >
                Unpublish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkUpdate({ isFeatured: true })}
                disabled={loading}
              >
                Feature
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkUpdate({ isFeatured: false })}
                disabled={loading}
              >
                Unfeature
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={bulkDelete}
                disabled={loading}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <Checkbox
          checked={selected.size === filteredComparisons.length && filteredComparisons.length > 0}
          onCheckedChange={selectAll}
        />
        <span className="text-sm text-muted-foreground">
          Select all {filteredComparisons.length > 0 && `(${filteredComparisons.length})`}
        </span>
      </div>

      {filteredComparisons.length === 0 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          No comparisons found matching your filters
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredComparisons.map((comparison) => {
          const statusCounts = {
            completed: comparison.videos.filter((v) => v.status === "COMPLETED")
              .length,
            processing: comparison.videos.filter(
              (v) => v.status === "PROCESSING" || v.status === "QUEUED"
            ).length,
            failed: comparison.videos.filter((v) => v.status === "FAILED")
              .length,
          };

          return (
            <div
              key={comparison.id}
              className="border rounded-lg p-6 hover:border-primary transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="pt-1">
                  <Checkbox
                    checked={selected.has(comparison.id)}
                    onCheckedChange={() => toggleSelection(comparison.id)}
                  />
                </div>

                <Link
                  href={`/admin/comparisons/${comparison.id}`}
                  className="flex-1 flex items-start justify-between gap-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{comparison.title}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">
                        {comparison.type}
                      </span>
                      {comparison.isPublic && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                          Public
                        </span>
                      )}
                      {comparison.isFeatured && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          Featured
                        </span>
                      )}
                    </div>

                    {comparison.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {comparison.description}
                      </p>
                    )}

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {comparison.prompt}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{comparison._count.videos} videos</span>
                      {statusCounts.completed > 0 && (
                        <span className="text-green-600">
                          ✓ {statusCounts.completed} completed
                        </span>
                      )}
                      {statusCounts.processing > 0 && (
                        <span className="text-blue-600">
                          ⏳ {statusCounts.processing} processing
                        </span>
                      )}
                      {statusCounts.failed > 0 && (
                        <span className="text-destructive">
                          ✗ {statusCounts.failed} failed
                        </span>
                      )}
                      <span>•</span>
                      <span>
                        {new Date(comparison.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {comparison.sourceImage && (
                    <img
                      src={comparison.sourceImage.url}
                      alt=""
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                </Link>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
