"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  endpoint: string | null;
  isActive: boolean;
  costPerSecond: number | null;
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

  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    providerId: "",
    endpoint: "",
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
      providerId: "",
      endpoint: "",
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
      providerId: model.provider.id,
      endpoint: model.endpoint || "",
      isActive: model.isActive,
      costPerSecond: model.costPerSecond?.toString() || "",
      capabilityIds: model.capabilities.map((c) => c.id),
    });
    setShowAddForm(true);
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
      const response = await fetch(`/api/admin/models/${model.id}`, {
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
            Manage AI video generation models
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
                <Label htmlFor="endpoint">Endpoint</Label>
                <Input
                  id="endpoint"
                  value={formData.endpoint}
                  onChange={(e) =>
                    setFormData({ ...formData, endpoint: e.target.value })
                  }
                  placeholder="e.g., fal-ai/kling-video/v1"
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
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Provider</th>
                <th className="text-left p-3 font-medium">Endpoint</th>
                <th className="text-left p-3 font-medium">Capabilities</th>
                <th className="text-left p-3 font-medium">Videos</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {models.map((model) => (
                <tr key={model.id} className="hover:bg-muted/50">
                  <td className="p-3">
                    <div className="font-medium">{model.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {model.slug}
                    </div>
                  </td>
                  <td className="p-3">{model.provider.displayName}</td>
                  <td className="p-3 text-sm font-mono">
                    {model.endpoint || "-"}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      {model.capabilities.map((cap) => (
                        <span
                          key={cap.id}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
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
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
