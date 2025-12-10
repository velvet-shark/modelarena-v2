"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, X } from "lucide-react";

type Model = {
  id: string;
  slug: string;
  name: string;
  provider: {
    id: string;
    name: string;
    displayName: string;
  };
  capabilities: Array<{
    id: string;
    name: string;
  }>;
};

interface GenerateFormProps {
  models: Model[];
}

export function GenerateForm({ models }: GenerateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [type, setType] = useState<"image-to-video" | "text-to-video">("image-to-video");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [duration, setDuration] = useState<5 | 10>(5);
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Group models by provider
  const modelsByProvider = models.reduce((acc, model) => {
    const providerName = model.provider.displayName;
    if (!acc[providerName]) {
      acc[providerName] = [];
    }
    acc[providerName].push(model);
    return acc;
  }, {} as Record<string, Model[]>);

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) => (prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]));
  };

  const selectAll = () => {
    setSelectedModels(models.map((m) => m.id));
  };

  const deselectAll = () => {
    setSelectedModels([]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSourceImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSourceImage(null);
    setSourceImagePreview(null);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!sourceImage) return null;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", sourceImage);

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload image");
      }

      const data = await response.json();
      return data.id;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Get form data before any async operations
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const prompt = formData.get("prompt") as string;
    const isPublic = formData.get("isPublic") === "on";
    const isFeatured = formData.get("isFeatured") === "on";

    try {
      // Validate image requirement for image-to-video
      if (type === "image-to-video" && !sourceImage) {
        setError("Please upload a source image for image-to-video generation");
        setLoading(false);
        return;
      }

      // Upload image first if needed
      let sourceImageId: string | undefined;
      if (type === "image-to-video" && sourceImage) {
        sourceImageId = (await uploadImage()) || undefined;
        if (!sourceImageId) {
          throw new Error("Failed to upload source image");
        }
      }

      const data = {
        title,
        description,
        type,
        prompt,
        sourceImageId,
        modelIds: selectedModels,
        isPublic,
        isFeatured,
        aspectRatio,
        duration
      };

      // Create comparison
      const response = await fetch("/api/comparisons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create comparison");
      }

      const comparison = await response.json();
      router.push(`/admin/comparisons/${comparison.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">{error}</div>}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required placeholder="Dancing Robot at Sunset" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea id="description" name="description" placeholder="A detailed description of this comparison..." />
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <RadioGroup value={type} onValueChange={(v) => setType(v as typeof type)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="image-to-video" id="image-to-video" />
              <Label htmlFor="image-to-video" className="font-normal cursor-pointer">
                Image-to-Video
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="text-to-video" id="text-to-video" />
              <Label htmlFor="text-to-video" className="font-normal cursor-pointer">
                Text-to-Video
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Generation Settings - Prominent */}
        <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
          <h3 className="font-semibold">Generation Settings</h3>

          <div className="space-y-2">
            <Label>Aspect Ratio</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "16:9", label: "16:9", desc: "Landscape" },
                { value: "9:16", label: "9:16", desc: "Portrait" },
                { value: "1:1", label: "1:1", desc: "Square" }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAspectRatio(option.value as typeof aspectRatio)}
                  className={`py-2 sm:py-3 px-2 sm:px-4 rounded-lg border-2 transition-colors ${
                    aspectRatio === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold text-sm sm:text-base">{option.label}</div>
                  <div className="text-xs text-muted-foreground hidden sm:block">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 5, label: "5 seconds", desc: "Faster, cheaper" },
                { value: 10, label: "10 seconds", desc: "Longer videos" }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDuration(option.value as typeof duration)}
                  className={`py-2 sm:py-3 px-2 sm:px-4 rounded-lg border-2 transition-colors ${
                    duration === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold text-sm sm:text-base">{option.label}</div>
                  <div className="text-xs text-muted-foreground hidden sm:block">{option.desc}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Note: Some models may not support all durations and will use their default.
            </p>
          </div>
        </div>

        {type === "image-to-video" && (
          <div className="space-y-2">
            <Label htmlFor="sourceImage">Source Image *</Label>
            {sourceImagePreview ? (
              <div className="relative border rounded-lg p-4">
                <img src={sourceImagePreview} alt="Source" className="max-h-64 mx-auto rounded" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <Label htmlFor="sourceImage" className="cursor-pointer text-sm text-muted-foreground">
                  Click to upload or drag and drop
                  <br />
                  <span className="text-xs">PNG, JPG, WebP (max 10MB)</span>
                </Label>
                <Input
                  id="sourceImage"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt</Label>
          <Textarea
            id="prompt"
            name="prompt"
            required
            placeholder={
              type === "image-to-video"
                ? "The character waves hello with a big smile..."
                : "A robot dancing gracefully at sunset on a beach..."
            }
            rows={4}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="isPublic" name="isPublic" />
            <Label htmlFor="isPublic">Make Public</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="isFeatured" name="isFeatured" />
            <Label htmlFor="isFeatured">Featured</Label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Label>Select Models ({selectedModels.length} selected)</Label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={deselectAll}>
              Deselect All
            </Button>
          </div>
        </div>

        <div className="border rounded-lg p-3 sm:p-4 space-y-6">
          {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
            <div key={provider} className="space-y-3">
              <div className="font-semibold text-sm text-muted-foreground">{provider}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {providerModels.map((model) => (
                  <div key={model.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={model.id}
                      checked={selectedModels.includes(model.id)}
                      onCheckedChange={() => toggleModel(model.id)}
                    />
                    <Label htmlFor={model.id} className="text-sm font-normal cursor-pointer">
                      {model.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {selectedModels.length === 0 && <p className="text-sm text-destructive">Please select at least one model</p>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <Button type="submit" disabled={loading || uploadingImage || selectedModels.length === 0} className="w-full sm:w-auto">
          {uploadingImage ? "Uploading Image..." : loading ? "Creating..." : "Create Comparison"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="w-full sm:w-auto">
          Cancel
        </Button>
      </div>
    </form>
  );
}
