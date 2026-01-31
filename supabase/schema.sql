-- ============================================
-- SPONSApp Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  client TEXT,
  site_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ZONES (areas within a project)
-- ============================================
CREATE TABLE zones (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_zones_project ON zones(project_id);

-- ============================================
-- LINE ITEMS - Maps 1:1 to LCY spreadsheet
-- ============================================
CREATE TYPE line_item_status AS ENUM (
  'PENDING_PASS1',      -- Awaiting transcription
  'PASS1_COMPLETE',     -- Raw entities extracted
  'PENDING_PASS2',      -- Awaiting normalisation
  'PASS2_COMPLETE',     -- Normalised, awaiting SPONS
  'PENDING_SPONS',      -- Awaiting SPONS match
  'UNMATCHED',          -- No SPONS candidates found
  'PENDING_QS_REVIEW',  -- Needs QS approval
  'APPROVED',           -- Ready for export
  'EXPORTED'            -- Included in export
);

CREATE TYPE asset_condition AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE line_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  zone_id TEXT REFERENCES zones(id),
  
  status line_item_status DEFAULT 'PENDING_PASS1',
  
  -- LCY3 Columns B-AC (exact mapping to spreadsheet)
  col_b_type TEXT,                        -- B: Type
  col_c_category TEXT,                    -- C: Category
  col_d_parent TEXT,                      -- D: Parent
  col_e_object TEXT,                      -- E: Object
  col_f_equipment_configuration TEXT,     -- F: Equipment Configuration
  col_g_description TEXT,                 -- G: Description
  col_h_equipment_present TEXT,           -- H: Is the equipment present on site
  col_i_prefilled_data_correct TEXT,      -- I: Is the pre-filled data correct
  col_j_commissioning_date TIMESTAMPTZ,   -- J: Commissioning Date DD/MM/YYYY
  col_k_manufacturer TEXT,                -- K: Manufacturer
  col_l_model TEXT,                       -- L: Model
  col_m_serial_number TEXT,               -- M: Serial Number
  col_n_new_manufacturer TEXT,            -- N: New Manufacturer
  col_o_asset_alias TEXT,                 -- O: Asset familiar name / alias
  col_p_refrigerant_type TEXT,            -- P: Refrigerant Type
  col_q_refrigerant_qty DECIMAL,          -- Q: QTY (kg)
  col_r_new_apm_label_required TEXT,      -- R: New APM label required
  col_s_floor TEXT,                       -- S: Floor
  col_t_location TEXT,                    -- T: Location
  col_u_asset_condition asset_condition,  -- U: Asset condition (Low/Medium/High risk)
  col_v_asset_size TEXT,                  -- V: Asset Size
  col_w_cibse_guidelines TEXT,            -- W: CIBSE Guidelines
  col_x_spons_cost_excl_vat DECIMAL,      -- X: SPONS – Cost of change – Excl VAT
  col_y_observations TEXT,                -- Y: Observations
  col_z_critical_spares TEXT,             -- Z: Critical spares required
  col_aa_cost_of_change_jayserv DECIMAL,  -- AA: Cost of Change – Jayserv
  col_ab_picture_taken TEXT,              -- AB: Picture Taken Y/N
  col_ac_risk_profile TEXT,               -- AC: Risk Profile
  
  -- LCY2 additional columns
  col_p_property TEXT,                    -- P: Property (LCY2)
  col_q_amazon_maintenance TEXT,          -- Q: Amazon responsible for maintenance (LCY2)
  
  -- Audit fields (MANDATORY per spec)
  raw_transcript TEXT,
  transcript_timestamp TIMESTAMPTZ,
  unit_conversion_logic TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_line_items_project ON line_items(project_id);
CREATE INDEX idx_line_items_status ON line_items(status);
CREATE INDEX idx_line_items_zone ON line_items(zone_id);

-- ============================================
-- CAPTURES - Audio & transcription
-- ============================================
CREATE TABLE captures (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  line_item_id TEXT NOT NULL REFERENCES line_items(id) ON DELETE CASCADE,
  
  -- Audio
  audio_url TEXT,                -- Supabase Storage URL
  audio_duration DECIMAL,
  audio_local_key TEXT,          -- IndexedDB key for offline
  
  -- Transcription (Pass 1 output)
  transcript TEXT,
  transcribed_at TIMESTAMPTZ,
  deepgram_job_id TEXT,
  
  -- Raw entities from Pass 1 (NO inference)
  raw_quantities JSONB,          -- [{ "value": 2, "unit": "nr" }]
  raw_components JSONB,          -- ["fire door", "fd30"]
  
  -- Sync status
  is_offline BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_captures_line_item ON captures(line_item_id);
CREATE INDEX idx_captures_idempotency ON captures(idempotency_key);

-- ============================================
-- SPONS ITEMS - Retrieval-only matching
-- ============================================
CREATE TABLE spons_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  item_code TEXT UNIQUE NOT NULL,
  book TEXT,
  section TEXT,
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  trade TEXT,
  rate DECIMAL,
  tags TEXT[],
  
  -- Vector embedding for similarity search (1536 dimensions for OpenAI)
  embedding vector(1536),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spons_code ON spons_items(item_code);
CREATE INDEX idx_spons_trade ON spons_items(trade);
CREATE INDEX idx_spons_unit ON spons_items(unit);

-- Vector similarity index (IVFFlat for faster search)
CREATE INDEX idx_spons_embedding ON spons_items 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================
-- SPONS MATCHES - Candidate tracking
-- ============================================
CREATE TABLE spons_matches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  line_item_id TEXT NOT NULL REFERENCES line_items(id) ON DELETE CASCADE,
  spons_item_id TEXT NOT NULL REFERENCES spons_items(id),
  
  -- Match metadata
  similarity_score DECIMAL,
  is_selected BOOLEAN DEFAULT FALSE,
  selected_by TEXT,
  selected_at TIMESTAMPTZ,
  
  -- Validation flags
  unit_matches BOOLEAN DEFAULT FALSE,
  trade_matches BOOLEAN DEFAULT FALSE,
  action_matches BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(line_item_id, spons_item_id)
);

CREATE INDEX idx_spons_matches_line_item ON spons_matches(line_item_id);
CREATE INDEX idx_spons_matches_selected ON spons_matches(line_item_id) WHERE is_selected = TRUE;

-- ============================================
-- AUDIT ENTRIES - Full traceability (MANDATORY)
-- ============================================
CREATE TYPE audit_action AS ENUM (
  'CREATED',
  'TRANSCRIBED',
  'PASS1_COMPLETE',
  'PASS2_NORMALISED',
  'SPONS_CANDIDATES_RETRIEVED',
  'SPONS_SELECTED',
  'QS_REVIEWED',
  'APPROVED',
  'EXPORTED',
  'MODIFIED'
);

CREATE TABLE audit_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  line_item_id TEXT NOT NULL REFERENCES line_items(id) ON DELETE CASCADE,
  
  action audit_action NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT,
  
  -- Detailed audit data
  spoken_sentence TEXT,
  unit_conversion_logic TEXT,
  spons_candidates_json JSONB,    -- Array of candidate IDs retrieved
  final_selection_id TEXT,        -- Selected SPONS item ID
  approval_status TEXT,
  
  metadata JSONB
);

CREATE INDEX idx_audit_line_item ON audit_entries(line_item_id);
CREATE INDEX idx_audit_action ON audit_entries(action);

-- ============================================
-- EXPORTS
-- ============================================
CREATE TYPE export_format AS ENUM ('EXCEL', 'PDF');
CREATE TYPE sheet_type AS ENUM ('LCY2', 'LCY3');

CREATE TABLE exports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id),
  
  file_name TEXT NOT NULL,
  file_url TEXT,
  format export_format NOT NULL,
  sheet_type sheet_type NOT NULL,
  
  row_count INTEGER NOT NULL,
  exported_by TEXT,
  exported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exports_project ON exports(project_id);

-- ============================================
-- COLUMN MAPPINGS - For export validation
-- ============================================
CREATE TABLE column_mappings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sheet_type sheet_type NOT NULL,
  column_letter TEXT NOT NULL,
  header_text TEXT NOT NULL,
  internal_field TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT FALSE,
  
  UNIQUE(sheet_type, column_letter)
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to search SPONS items by vector similarity
-- Filters by trade and unit FIRST, then ranks by similarity
CREATE OR REPLACE FUNCTION search_spons_items(
  query_embedding vector(1536),
  filter_trade TEXT DEFAULT NULL,
  filter_unit TEXT DEFAULT NULL,
  match_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id TEXT,
  item_code TEXT,
  description TEXT,
  unit TEXT,
  trade TEXT,
  rate DECIMAL,
  similarity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.item_code,
    s.description,
    s.unit,
    s.trade,
    s.rate,
    (1 - (s.embedding <=> query_embedding))::DECIMAL as similarity
  FROM spons_items s
  WHERE 
    s.embedding IS NOT NULL
    AND (filter_trade IS NULL OR s.trade = filter_trade)
    AND (filter_unit IS NULL OR s.unit = filter_unit)
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_line_items_updated_at
  BEFORE UPDATE ON line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE spons_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE spons_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE column_mappings ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated users (adjust based on your auth setup)
CREATE POLICY "Allow all for authenticated users" ON projects
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON zones
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON line_items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON captures
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON spons_items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON spons_matches
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON audit_entries
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON exports
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON column_mappings
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow anon read access to SPONS items (they're reference data)
CREATE POLICY "Allow anon read on spons_items" ON spons_items
  FOR SELECT USING (true);

CREATE POLICY "Allow anon read on column_mappings" ON column_mappings
  FOR SELECT USING (true);
