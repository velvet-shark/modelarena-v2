-- DropIndex
DROP INDEX "Comparison_isPublic_idx";

-- DropIndex
DROP INDEX "Comparison_isFeatured_idx";

-- DropIndex
DROP INDEX "Video_status_idx";

-- DropIndex
DROP INDEX "Video_comparisonId_idx";

-- DropIndex
DROP INDEX "Video_modelId_idx";

-- DropIndex
DROP INDEX "Video_voteCount_idx";

-- DropIndex
DROP INDEX "Vote_videoId_idx";

-- CreateIndex
CREATE INDEX "Comparison_isPublic_isFeatured_createdAt_idx" ON "Comparison"("isPublic", "isFeatured", "createdAt");

-- CreateIndex
CREATE INDEX "Video_modelId_status_createdAt_idx" ON "Video"("modelId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Vote_videoId_ipHash_idx" ON "Vote"("videoId", "ipHash");

