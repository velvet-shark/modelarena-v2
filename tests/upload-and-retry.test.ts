import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_MANUAL_VIDEO_BYTES,
  ManualUploadError,
  STAGING_KEY,
  checkManualVideoFile,
  manualVideoFieldsSchema,
} from "@/lib/manual-video";
import { isRetryableStatus } from "@/src/lib/providers/types";

test("staging keys: only uploads/{uuid}.{mp4,mov,webm}", () => {
  const uuid = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
  assert.match(`uploads/${uuid}.mp4`, STAGING_KEY);
  assert.match(`uploads/${uuid}.webm`, STAGING_KEY);
  assert.doesNotMatch(`videos/${uuid}.mp4`, STAGING_KEY);
  assert.doesNotMatch(`uploads/${uuid}.exe`, STAGING_KEY);
  assert.doesNotMatch(`uploads/../videos/${uuid}.mp4`, STAGING_KEY);
  assert.doesNotMatch(`uploads/${uuid}.mp4/x`, STAGING_KEY);
});

test("manual video file checks", () => {
  assert.doesNotThrow(() => checkManualVideoFile("video/quicktime", 1024));
  assert.throws(() => checkManualVideoFile("video/x-matroska", 1024), ManualUploadError);
  assert.throws(() => checkManualVideoFile(undefined, 1024), ManualUploadError);
  assert.throws(() => checkManualVideoFile("video/mp4", MAX_MANUAL_VIDEO_BYTES + 1), ManualUploadError);
});

test("manual video form fields: empty strings drop out, numbers coerce", () => {
  const fields = manualVideoFieldsSchema.parse({
    comparisonId: "c",
    modelId: "m",
    generationTime: "42.5",
    cost: "",
    duration: null,
    notes: "",
  });
  assert.equal(fields.generationTime, 42.5);
  assert.equal(fields.cost, undefined);
  assert.equal(fields.duration, undefined);
  assert.equal(fields.notes, undefined);
  assert.equal(manualVideoFieldsSchema.safeParse({ comparisonId: "c", modelId: "m", duration: "0" }).success, false);
  assert.equal(manualVideoFieldsSchema.safeParse({ comparisonId: "c", modelId: "m", cost: "abc" }).success, false);
});

test("provider errors: retry network, timeouts, rate limits and 5xx only", () => {
  for (const status of [undefined, 408, 429, 500, 502, 503]) assert.equal(isRetryableStatus(status), true, String(status));
  for (const status of [400, 401, 403, 404, 422]) assert.equal(isRetryableStatus(status), false, String(status));
});
