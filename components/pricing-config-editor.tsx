"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PricingConfig } from "@/src/lib/pricing/types";

interface PricingConfigEditorProps {
  value: PricingConfig | null;
  onChange: (config: PricingConfig | null) => void;
}

export function PricingConfigEditor({
  value,
  onChange,
}: PricingConfigEditorProps) {
  const model = value?.model || "per-second";
  // Derived, so it stays right when the pricing model or value changes
  const useAudioPricing = typeof (value as any)?.pricePerSecond === "object";

  // Empty or partial input would otherwise store NaN (saved as null)
  const num = (raw: string, parse: (v: string) => number = parseFloat) => {
    const n = parse(raw);
    return Number.isNaN(n) ? 0 : n;
  };
  const int = (v: string) => parseInt(v, 10);

  const updateConfig = (updates: Partial<any>) => {
    if (!value) {
      onChange({ model: "per-second", pricePerSecond: 0, ...updates });
      return;
    }
    onChange({ ...value, ...updates } as PricingConfig);
  };

  const handleModelChange = (newModel: string) => {
    // Reset to default config for the selected model type
    switch (newModel) {
      case "per-second":
        onChange({ model: "per-second", pricePerSecond: 0 });
        break;
      case "base-plus-per-second":
        onChange({
          model: "base-plus-per-second",
          basePrice: 0,
          baseDuration: 5,
          pricePerExtraSecond: 0,
        });
        break;
      case "flat-rate":
        onChange({ model: "flat-rate", price: 0 });
        break;
      case "resolution-dependent":
        onChange({
          model: "resolution-dependent",
          pricingType: "per-second",
          tiers: [
            { maxWidth: 1280, maxHeight: 720, price: 0 },
            { maxWidth: 1920, maxHeight: 1080, price: 0 },
          ],
        });
        break;
    }
  };

  const renderPricingFields = () => {
    if (!value) return null;

    switch (model) {
      case "per-second":
        const perSecondConfig = value as any;
        if (useAudioPricing) {
          return (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price per second (no audio)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={perSecondConfig.pricePerSecond?.withoutAudio || 0}
                  onChange={(e) =>
                    updateConfig({
                      pricePerSecond: {
                        withoutAudio: num(e.target.value),
                        withAudio:
                          perSecondConfig.pricePerSecond?.withAudio || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Price per second (with audio)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={perSecondConfig.pricePerSecond?.withAudio || 0}
                  onChange={(e) =>
                    updateConfig({
                      pricePerSecond: {
                        withoutAudio:
                          perSecondConfig.pricePerSecond?.withoutAudio || 0,
                        withAudio: num(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-2">
              <Label>Price per second ($)</Label>
              <Input
                type="number"
                step="0.0001"
                value={
                  typeof perSecondConfig.pricePerSecond === "number"
                    ? perSecondConfig.pricePerSecond
                    : 0
                }
                onChange={(e) =>
                  updateConfig({ pricePerSecond: num(e.target.value) })
                }
              />
            </div>
          );
        }

      case "base-plus-per-second":
        const basePlusConfig = value as any;
        return (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Base price ($)</Label>
              <Input
                type="number"
                step="0.0001"
                value={basePlusConfig.basePrice || 0}
                onChange={(e) =>
                  updateConfig({ basePrice: num(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Base duration (s)</Label>
              <Input
                type="number"
                step="0.1"
                value={basePlusConfig.baseDuration || 0}
                onChange={(e) =>
                  updateConfig({ baseDuration: num(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Extra per second ($)</Label>
              <Input
                type="number"
                step="0.0001"
                value={basePlusConfig.pricePerExtraSecond || 0}
                onChange={(e) =>
                  updateConfig({
                    pricePerExtraSecond: num(e.target.value),
                  })
                }
              />
            </div>
          </div>
        );

      case "flat-rate":
        const flatRateConfig = value as any;
        return (
          <div className="space-y-2">
            <Label>Flat price ($)</Label>
            <Input
              type="number"
              step="0.0001"
              value={flatRateConfig.price || 0}
              onChange={(e) =>
                updateConfig({ price: num(e.target.value) })
              }
            />
          </div>
        );

      case "resolution-dependent":
        const resConfig = value as any;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pricing Type</Label>
              <Select
                value={resConfig.pricingType || "per-second"}
                onValueChange={(val) => updateConfig({ pricingType: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per-second">Per Second</SelectItem>
                  <SelectItem value="flat-rate">Flat Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Resolution Tiers</Label>
              <div className="space-y-2">
                {(resConfig.tiers || []).map((tier: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <Input
                      type="number"
                      placeholder="Max Width"
                      value={tier.maxWidth}
                      onChange={(e) => {
                        // Copy the tier: mutating it would change the parent's state in place
                        const newTiers = resConfig.tiers.map((t: any, i: number) =>
                          i === idx ? { ...t, maxWidth: num(e.target.value, int) } : t
                        );
                        updateConfig({ tiers: newTiers });
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Max Height"
                      value={tier.maxHeight}
                      onChange={(e) => {
                        // Copy the tier: mutating it would change the parent's state in place
                        const newTiers = resConfig.tiers.map((t: any, i: number) =>
                          i === idx ? { ...t, maxHeight: num(e.target.value, int) } : t
                        );
                        updateConfig({ tiers: newTiers });
                      }}
                    />
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="Price"
                      value={tier.price}
                      onChange={(e) => {
                        // Copy the tier: mutating it would change the parent's state in place
                        const newTiers = resConfig.tiers.map((t: any, i: number) =>
                          i === idx ? { ...t, price: num(e.target.value) } : t
                        );
                        updateConfig({ tiers: newTiers });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newTiers = resConfig.tiers.filter(
                          (_: any, i: number) => i !== idx
                        );
                        updateConfig({ tiers: newTiers });
                      }}
                      className="text-sm text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  updateConfig({
                    tiers: [
                      ...(resConfig.tiers || []),
                      { maxWidth: 1920, maxHeight: 1080, price: 0 },
                    ],
                  });
                }}
                className="text-sm text-primary hover:underline"
              >
                + Add Tier
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
      <div className="space-y-2">
        <Label>Pricing Model</Label>
        <Select value={model} onValueChange={handleModelChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="per-second">Per Second</SelectItem>
            <SelectItem value="base-plus-per-second">
              Base + Per Second
            </SelectItem>
            <SelectItem value="flat-rate">Flat Rate</SelectItem>
            <SelectItem value="resolution-dependent">
              Resolution Dependent
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {model === "per-second" && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={useAudioPricing}
            onCheckedChange={(checked) => {
              if (checked) {
                updateConfig({
                  pricePerSecond: { withoutAudio: 0, withAudio: 0 },
                });
              } else {
                updateConfig({ pricePerSecond: 0 });
              }
            }}
          />
          <span className="text-sm">Different pricing for audio/no audio</span>
        </div>
      )}

      {renderPricingFields()}

      <div className="flex items-center gap-2">
        <Checkbox
          checked={value?.isEstimated || false}
          onCheckedChange={(checked) =>
            updateConfig({ isEstimated: checked as boolean })
          }
        />
        <span className="text-sm">Mark as estimated pricing</span>
      </div>
    </div>
  );
}
