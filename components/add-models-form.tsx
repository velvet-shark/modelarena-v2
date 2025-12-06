"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";

type Model = {
  id: string;
  slug: string;
  name: string;
  provider: {
    id: string;
    name: string;
    displayName: string;
  };
};

interface AddModelsFormProps {
  comparisonId: string;
  allModels: Model[];
  existingModelIds: string[];
}

export function AddModelsForm({
  comparisonId,
  allModels,
  existingModelIds,
}: AddModelsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const existingSet = new Set(existingModelIds);
  const availableModels = allModels.filter((m) => !existingSet.has(m.id));

  // Group available models by provider
  const modelsByProvider = availableModels.reduce((acc, model) => {
    const providerName = model.provider.displayName;
    if (!acc[providerName]) {
      acc[providerName] = [];
    }
    acc[providerName].push(model);
    return acc;
  }, {} as Record<string, Model[]>);

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  };

  const selectAll = () => {
    setSelectedModels(availableModels.map((m) => m.id));
  };

  const deselectAll = () => {
    setSelectedModels([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/comparisons/${comparisonId}/add-models`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelIds: selectedModels,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add models");
      }

      // Reset form and refresh page
      setSelectedModels([]);
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (availableModels.length === 0) {
    return (
      <div className="border rounded-lg p-6 bg-muted/30">
        <p className="text-sm text-muted-foreground text-center">
          All available models have already been added to this comparison.
        </p>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="border rounded-lg p-6 bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">Add More Models</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {availableModels.length} model{availableModels.length !== 1 ? "s" : ""} available to add
            </p>
          </div>
          <Button onClick={() => setIsOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Models
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-6 bg-muted/30 space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm">Add Models to Comparison</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedModels.length} of {availableModels.length} selected
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={selectAll}
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={deselectAll}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-6 bg-background">
        {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
          <div key={provider} className="space-y-3">
            <div className="font-semibold text-sm text-muted-foreground">
              {provider}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {providerModels.map((model) => (
                <div key={model.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`add-${model.id}`}
                    checked={selectedModels.includes(model.id)}
                    onCheckedChange={() => toggleModel(model.id)}
                  />
                  <Label
                    htmlFor={`add-${model.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {model.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading || selectedModels.length === 0} size="sm">
          {loading ? "Adding..." : `Add ${selectedModels.length} Model${selectedModels.length !== 1 ? "s" : ""}`}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setIsOpen(false);
            setSelectedModels([]);
            setError(null);
          }}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
