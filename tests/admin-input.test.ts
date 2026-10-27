import { test } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import {
  comparisonUpdateSchema,
  modelCreateSchema,
  modelData,
  modelUpdateSchema,
  videoUpdateSchema,
} from "@/lib/admin-input";

test("model form values: empty strings become null, numbers coerce", () => {
  const input = modelUpdateSchema.parse({
    slug: "ignored",
    name: " Kling ",
    brand: "",
    endpoint: "fal-ai/kling",
    endpointT2V: "",
    costPerSecond: "0.07",
    isActive: true,
    capabilityIds: ["a", "b"],
  });
  assert.equal(input.name, "Kling");
  assert.equal(input.brand, null);
  assert.equal(input.endpointT2V, null);
  assert.equal(input.costPerSecond, 0.07);
  assert.equal("slug" in input, false);

  const data = modelData(input);
  assert.deepEqual(data.capabilities, { set: [{ id: "a" }, { id: "b" }] });
});

test("model update: empty capability list clears, null params reset", () => {
  const data = modelData(modelUpdateSchema.parse({ capabilityIds: [], defaultParams: null }));
  assert.deepEqual(data.capabilities, { set: [] });
  assert.equal(data.defaultParams, Prisma.JsonNull);
});

test("model update: untouched fields stay out of the update", () => {
  const data = modelData(modelUpdateSchema.parse({ isActive: false }));
  assert.deepEqual(data, { isActive: false });
});

test("model create: slug format and required fields", () => {
  assert.equal(modelCreateSchema.safeParse({ slug: "kling-2.5", name: "K", providerId: "p" }).success, true);
  assert.equal(modelCreateSchema.safeParse({ slug: "Kling 2.5", name: "K", providerId: "p" }).success, false);
  assert.equal(modelCreateSchema.safeParse({ slug: "k", name: "", providerId: "p" }).success, false);
  assert.equal(modelCreateSchema.safeParse({ slug: "k", name: "K", costPerSecond: "-1", providerId: "p" }).success, false);
});

test("video update: cost editor payloads", () => {
  assert.deepEqual(videoUpdateSchema.parse({ cost: 0.25 }), { cost: 0.25 });
  assert.deepEqual(videoUpdateSchema.parse({ cost: null }), { cost: null });
  assert.deepEqual(videoUpdateSchema.parse({ cost: "" }), { cost: null });
  assert.equal(videoUpdateSchema.safeParse({ cost: -1 }).success, false);
  assert.equal(videoUpdateSchema.safeParse({ cost: "abc" }).success, false);
  assert.equal(videoUpdateSchema.safeParse({}).success, false);
});

test("comparison update: edit form and bulk payloads", () => {
  assert.deepEqual(comparisonUpdateSchema.parse({ isPublic: true }), { isPublic: true });
  const form = comparisonUpdateSchema.parse({
    title: "Robots",
    description: "",
    isPublic: false,
    isFeatured: true,
    tagIds: ["t1"],
  });
  assert.equal(form.description, null);
  assert.equal(comparisonUpdateSchema.safeParse({ title: "" }).success, false);
  assert.equal(comparisonUpdateSchema.safeParse({ isPublic: "yes" }).success, false);
});
