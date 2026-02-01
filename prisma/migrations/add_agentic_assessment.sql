-- Add fields for agentic assessment
ALTER TABLE line_items 
ADD COLUMN source_capture_id UUID,
ADD COLUMN pass2_status TEXT DEFAULT 'PENDING',
ADD COLUMN pass2_confidence DECIMAL(3,2),
ADD COLUMN spons_candidate_code TEXT,
ADD COLUMN spons_candidate_label TEXT,
ADD COLUMN spons_candidates JSONB,
ADD COLUMN pass2_error TEXT;

-- Create index for faster queries
CREATE INDEX idx_line_items_source_capture_id ON line_items(source_capture_id);
CREATE INDEX idx_line_items_pass2_status ON line_items(pass2_status);
