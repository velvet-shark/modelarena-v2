"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Settings2 } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  displayName: string;
}

interface Capability {
  id: string;
  name: string;
}

interface Model {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  endpoint: string | null;
  endpointT2V: string | null;
  isActive: boolean;
  costPerSecond: number | null;
  defaultParams: any;
  provider: Provider;
  capabilities: Capability[];
  _count: {
    videos: number;
  };
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [paramsEditorOpen, setParamsEditorOpen] = useState(false);
  const [paramsEditorModel, setParamsEditorModel] = useState<Model | null>(
    null
  );
  const [paramsJson, setParamsJson] = useState("");
  const [paramsError, setParamsError] = useState<string | null>(null);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    brand: "",
    providerId: "",
    endpoint: "",
    endpointT2V: "",
    isActive: true,
    costPerSecond: "",
    capabilityIds: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [modelsRes, providersRes, capabilitiesRes] = await Promise.all([
        fetch("/api/admin/models"),
        fetch("/api/admin/providers"),
        fetch("/api/admin/capabilities"),
      ]);

      const modelsData = await modelsRes.json();
      const providersData = await providersRes.json();
      const capabilitiesData = await capabilitiesRes.json();

      setModels(modelsData.models || []);
      setProviders(providersData.providers || []);
      setCapabilities(capabilitiesData.capabilities || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      slug: "",
      name: "",
      brand: "",
      providerId: "",
      endpoint: "",
      endpointT2V: "",
      isActive: true,
      costPerSecond: "",
      capabilityIds: [],
    });
    setEditingModel(null);
    setShowAddForm(false);
  };

  const handleEdit = (model: Model) => {
    setEditingModel(model);
    setFormData({
      slug: model.slug,
      name: model.name,
      brand: model.brand || "",
      providerId: model.provider.id,
      endpoint: model.endpoint || "",
      endpointT2V: model.endpointT2V || "",
      isActive: model.isActive,
      costPerSecond: model.costPerSecond?.toString() || "",
      capabilityIds: model.capabilities.map((c) => c.id),
    });
    setShowAddForm(true);
  };

  const openParamsEditor = (model: Model) => {
    setParamsEditorModel(model);
    setParamsJson(JSON.stringify(model.defaultParams || {}, null, 2));
    setParamsError(null);
    setParamsEditorOpen(true);
  };

  const saveParams = async () => {
    if (!paramsEditorModel) return;

    try {
      const parsed = JSON.parse(paramsJson);
      setParamsError(null);

      const response = await fetch(`/api/models/${paramsEditorModel.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultParams: parsed }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save parameters");
      }

      await fetchData();
      setParamsEditorOpen(false);
      setParamsEditorModel(null);
    } catch (error) {
      if (error instanceof SyntaxError) {
        setParamsError("Invalid JSON syntax");
      } else {
        setParamsError(
          error instanceof Error ? error.message : "Failed to save"
        );
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingModel
        ? `/api/admin/models/${editingModel.id}`
        : "/api/admin/models";

      const method = editingModel ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save model");
      }

      await fetchData();
      resetForm();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save model");
    }
  };

  const toggleActive = async (model: Model) => {
    try {
      const response = await fetch(`/api/models/${model.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !model.isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle model status");
      }

      await fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to toggle model");
    }
  };

  const handleDelete = async (model: Model) => {
    if (
      !confirm(
        `Are you sure you want to delete ${model.name}? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/models/${model.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete model");
      }

      await fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete model");
    }
  };

  const toggleCapability = (capId: string) => {
    setFormData((prev) => ({
      ...prev,
      capabilityIds: prev.capabilityIds.includes(capId)
        ? prev.capabilityIds.filter((id) => id !== capId)
        : [...prev.capabilityIds, capId],
    }));
  };

  const toggleExpanded = (modelId: string) => {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Model Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage AI video generation models ({models.length} models)
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>Add Model</Button>
      </div>

      {showAddForm && (
        <div className="border rounded-lg p-6 bg-muted/50">
          <h2 className="text-xl font-semibold mb-4">
            {editingModel ? "Edit Model" : "Add New Model"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  disabled={!!editingModel}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData({ ...formData, brand: e.target.value })
                  }
                  placeholder="e.g., KlingAI, Google, OpenAI"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="providerId">Provider *</Label>
                <Select
                  value={formData.providerId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, providerId: value })
                  }
                  disabled={!!editingModel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endpoint">I2V Endpoint</Label>
                <Input
                  id="endpoint"
                  value={formData.endpoint}
                  onChange={(e) =>
                    setFormData({ ...formData, endpoint: e.target.value })
                  }
                  placeholder="e.g., fal-ai/kling-video/v1/image-to-video"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endpointT2V">T2V Endpoint</Label>
                <Input
                  id="endpointT2V"
                  value={formData.endpointT2V}
                  onChange={(e) =>
                    setFormData({ ...formData, endpointT2V: e.target.value })
                  }
                  placeholder="e.g., fal-ai/kling-video/v1/text-to-video"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="costPerSecond">Cost per Second ($)</Label>
                <Input
                  id="costPerSecond"
                  type="number"
                  step="0.001"
                  value={formData.costPerSecond}
                  onChange={(e) =>
                    setFormData({ ...formData, costPerSecond: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked as boolean })
                    }
                  />
                  <span className="text-sm">Active</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Capabilities</Label>
              <div className="flex gap-4">
                {capabilities.map((cap) => (
                  <div key={cap.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.capabilityIds.includes(cap.id)}
                      onCheckedChange={() => toggleCapability(cap.id)}
                    />
                    <span className="text-sm">{cap.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingModel ? "Update" : "Create"} Model
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium w-8"></th>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Provider</th>
                <th className="text-left p-3 font-medium">Capabilities</th>
                <th className="text-left p-3 font-medium">Videos</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {models.map((model) => (
                <>
                  <tr key={model.id} className="hover:bg-muted/50">
                    <td className="p-3">
                      <button
                        onClick={() => toggleExpanded(model.id)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        {expandedModels.has(model.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{model.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {model.slug}
                      </div>
                    </td>
                    <td className="p-3">{model.provider.displayName}</td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {model.capabilities.map((cap) => (
                          <span
                            key={cap.id}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded dark:bg-blue-900 dark:text-blue-200"
                          >
                            {cap.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">{model._count.videos}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          model.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {model.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openParamsEditor(model)}
                          title="Edit Parameters"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(model)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={model.isActive ? "outline" : "default"}
                          onClick={() => toggleActive(model)}
                        >
                          {model.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        {model._count.videos === 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(model)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedModels.has(model.id) && (
                    <tr key={`${model.id}-details`} className="bg-muted/30">
                      <td colSpan={7} className="p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">I2V Endpoint:</span>
                            <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                              {model.endpoint || "None"}
                            </code>
                          </div>
                          <div>
                            <span className="font-medium">T2V Endpoint:</span>
                            <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                              {model.endpointT2V || "None"}
                            </code>
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium">
                              Default Parameters:
                            </span>
                            <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto max-h-60">
                              {JSON.stringify(model.defaultParams, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parameters Editor Dialog */}
      <Dialog open={paramsEditorOpen} onOpenChange={setParamsEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Edit Parameters: {paramsEditorModel?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Edit the default parameters JSON. This includes i2v, t2v, and
              pricing configuration.
            </p>
            <Textarea
              value={paramsJson}
              onChange={(e) => {
                setParamsJson(e.target.value);
                setParamsError(null);
              }}
              className="flex-1 min-h-[400px] font-mono text-sm"
              placeholder="{}"
            />
            {paramsError && (
              <p className="text-sm text-red-500">{paramsError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setParamsEditorOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={saveParams}>Save Parameters</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
