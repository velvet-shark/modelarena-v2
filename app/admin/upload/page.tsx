"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Comparison {
  id: string;
  title: string;
  type: string;
}

interface Model {
  id: string;
  name: string;
  slug: string;
  provider: {
    name: string;
    displayName: string;
  };
}

export default function UploadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    comparisonId: "",
    modelId: "",
    video: null as File | null,
    generationTime: "",
    cost: "",
    duration: "",
    notes: "",
  });

  // Load comparisons and models
  useState(() => {
    Promise.all([
      fetch("/api/comparisons").then((r) => r.json()),
      fetch("/api/models").then((r) => r.json()),
    ])
      .then(([compData, modData]) => {
        setComparisons(compData.comparisons || []);
        setModels(modData.models || []);
      })
      .catch((err) => {
        setError("Failed to load data");
        console.error(err);
      })
      .finally(() => {
        setLoadingData(false);
      });
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!formData.comparisonId || !formData.modelId || !formData.video) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append("video", formData.video);
      data.append("comparisonId", formData.comparisonId);
      data.append("modelId", formData.modelId);
      if (formData.generationTime)
        data.append("generationTime", formData.generationTime);
      if (formData.cost) data.append("cost", formData.cost);
      if (formData.duration) data.append("duration", formData.duration);
      if (formData.notes) data.append("notes", formData.notes);

      const response = await fetch("/api/upload/video", {
        method: "POST",
        body: data,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setSuccess(true);
      setFormData({
        comparisonId: "",
        modelId: "",
        video: null,
        generationTime: "",
        cost: "",
        duration: "",
        notes: "",
      });

      // Reset file input
      const fileInput = document.getElementById("video") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Redirect to comparison page after a short delay
      setTimeout(() => {
        router.push(`/admin/comparisons/${formData.comparisonId}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Manual Video Upload</h1>
        <p className="text-muted-foreground mt-2">
          Upload videos manually for models without API access
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
            Video uploaded successfully! Redirecting...
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="comparisonId">
            Comparison <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.comparisonId}
            onValueChange={(value) =>
              setFormData({ ...formData, comparisonId: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a comparison" />
            </SelectTrigger>
            <SelectContent>
              {comparisons.map((comp) => (
                <SelectItem key={comp.id} value={comp.id}>
                  {comp.title} ({comp.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="modelId">
            Model <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.modelId}
            onValueChange={(value) =>
              setFormData({ ...formData, modelId: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.provider.displayName} - {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="video">
            Video File <span className="text-red-500">*</span>
          </Label>
          <Input
            id="video"
            type="file"
            accept="video/*"
            onChange={(e) =>
              setFormData({ ...formData, video: e.target.files?.[0] || null })
            }
          />
          <p className="text-xs text-muted-foreground">
            Max size: 500MB. Supported formats: MP4, MOV, WebM
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="generationTime">Generation Time (s)</Label>
            <Input
              id="generationTime"
              type="number"
              step="0.1"
              placeholder="e.g., 45.2"
              value={formData.generationTime}
              onChange={(e) =>
                setFormData({ ...formData, generationTime: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Cost ($)</Label>
            <Input
              id="cost"
              type="number"
              step="0.001"
              placeholder="e.g., 0.15"
              value={formData.cost}
              onChange={(e) =>
                setFormData({ ...formData, cost: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (s)</Label>
            <Input
              id="duration"
              type="number"
              step="0.1"
              placeholder="e.g., 5.0"
              value={formData.duration}
              onChange={(e) =>
                setFormData({ ...formData, duration: e.target.value })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any additional notes about this video..."
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={3}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Uploading..." : "Upload Video"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/comparisons")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
