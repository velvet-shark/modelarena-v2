import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Request bodies for admin mutations. Form inputs send "" for empty fields,
// so optional text and numbers treat "" as null.

const emptyToNull = (v: unknown) => (v === "" ? null : v);

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable()).optional();

const optionalNumber = z
  .preprocess(emptyToNull, z.coerce.number().nonnegative().nullable())
  .optional();

const ids = z.array(z.string().min(1)).max(100);

export const comparisonUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: optionalText(5000),
  isPublic: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  tagIds: ids.optional(),
});

export const videoUpdateSchema = z
  .object({
    cost: optionalNumber,
    generationTime: optionalNumber,
    duration: optionalNumber,
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "No fields to update");

const modelFields = {
  name: z.string().trim().min(1).max(200),
  brand: optionalText(100),
  endpoint: optionalText(500),
  endpointT2V: optionalText(500),
  isActive: z.boolean().optional(),
  costPerSecond: optionalNumber,
  capabilityIds: ids.optional(),
  defaultParams: z.record(z.unknown()).nullable().optional(),
};

export const modelCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9.-]*$/, "Use lowercase letters, digits, dots and dashes")
    .max(100),
  providerId: z.string().min(1),
  ...modelFields,
});

export const modelUpdateSchema = z.object(modelFields).partial();

type ModelUpdate = z.infer<typeof modelUpdateSchema>;

export function modelData(input: ModelUpdate) {
  const { capabilityIds, defaultParams, ...fields } = input;
  return {
    ...fields,
    ...(defaultParams !== undefined && {
      defaultParams:
        defaultParams === null ? Prisma.JsonNull : (defaultParams as Prisma.InputJsonValue),
    }),
    // One statement replaces the whole set, so a failure can't leave none
    ...(capabilityIds && { capabilities: { set: capabilityIds.map((id) => ({ id })) } }),
  } satisfies Prisma.ModelUpdateInput;
}

export function invalidInput(error: z.ZodError) {
  return NextResponse.json(
    { error: error.errors[0]?.message ?? "Invalid input", details: error.errors },
    { status: 400 }
  );
}
