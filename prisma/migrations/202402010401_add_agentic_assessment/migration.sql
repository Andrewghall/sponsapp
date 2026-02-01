-- Alter table to add agentic assessment fields
ALTER TABLE "line_items" 
ADD COLUMN "source_capture_id" TEXT,
ADD COLUMN "pass2_status" TEXT DEFAULT 'PENDING',
ADD COLUMN "pass2_confidence" DECIMAL(3,2),
ADD COLUMN "spons_candidate_code" TEXT,
ADD COLUMN "spons_candidate_label" TEXT,
ADD COLUMN "spons_candidates" JSONB,
ADD COLUMN "pass2_error_new" TEXT;

-- Create indexes for performance
CREATE INDEX "line_items_source_capture_id_idx" ON "line_items"("source_capture_id");
CREATE INDEX "line_items_pass2_status_idx" ON "line_items"("pass2_status");
