"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface ComparisonEditFormProps {
  comparison: {
    id: string;
    title: string;
    description: string | null;
    isPublic: boolean;
    isFeatured: boolean;
    tags: Tag[];
  };
  availableTags: Tag[];
}

export function ComparisonEditForm({
  comparison,
  availableTags,
}: ComparisonEditFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: comparison.title,
    description: comparison.description || "",
    isPublic: comparison.isPublic,
    isFeatured: comparison.isFeatured,
    tagIds: comparison.tags.map((t) => t.id),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/comparisons/${comparison.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to update comparison");
      }

      router.refresh();
      setIsOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this comparison? This will also delete all videos."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/comparisons/${comparison.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete comparison");
      }

      router.push("/admin/comparisons");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete");
      setLoading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  if (!isOpen) {
    return (
      <div className="flex gap-2">
        <Button onClick={() => setIsOpen(true)}>Edit Comparison</Button>
        <Button variant="destructive" onClick={handleDelete} disabled={loading}>
          Delete
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-muted/50">
      <h2 className="text-xl font-semibold mb-4">Edit Comparison</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
          />
        </div>

        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="isPublic"
              checked={formData.isPublic}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isPublic: checked as boolean })
              }
            />
            <Label htmlFor="isPublic">Public</Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isFeatured"
              checked={formData.isFeatured}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isFeatured: checked as boolean })
              }
            />
            <Label htmlFor="isFeatured">Featured</Label>
          </div>
        </div>

        {availableTags.length > 0 && (
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-4 flex-wrap">
              {availableTags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`tag-${tag.id}`}
                    checked={formData.tagIds.includes(tag.id)}
                    onCheckedChange={() => toggleTag(tag.id)}
                  />
                  <Label htmlFor={`tag-${tag.id}`}>{tag.name}</Label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
