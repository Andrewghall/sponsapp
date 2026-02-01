-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "asset_condition" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('CREATED', 'TRANSCRIBED', 'PASS1_COMPLETE', 'PASS2_NORMALISED', 'SPONS_CANDIDATES_RETRIEVED', 'SPONS_SELECTED', 'QS_REVIEWED', 'APPROVED', 'EXPORTED', 'MODIFIED');

-- CreateEnum
CREATE TYPE "export_format" AS ENUM ('EXCEL', 'PDF');

-- CreateEnum
CREATE TYPE "line_item_status" AS ENUM ('PENDING_PASS1', 'PASS1_COMPLETE', 'PENDING_PASS2', 'PASS2_COMPLETE', 'PASS2_ERROR', 'PENDING_SPONS', 'UNMATCHED', 'PENDING_QS_REVIEW', 'APPROVED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "sheet_type" AS ENUM ('LCY2', 'LCY3');

-- CreateTable
CREATE TABLE "audit_entries" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "line_item_id" TEXT NOT NULL,
    "action" "audit_action" NOT NULL,
    "timestamp" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "spoken_sentence" TEXT,
    "unit_conversion_logic" TEXT,
    "spons_candidates_json" JSONB,
    "final_selection_id" TEXT,
    "approval_status" TEXT,
    "metadata" JSONB,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "captures" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "line_item_id" TEXT NOT NULL,
    "audio_url" TEXT,
    "audio_duration" DECIMAL,
    "audio_local_key" TEXT,
    "transcript" TEXT,
    "transcribed_at" TIMESTAMPTZ(6),
    "deepgram_job_id" TEXT,
    "raw_quantities" JSONB,
    "raw_components" JSONB,
    "is_offline" BOOLEAN DEFAULT false,
    "synced_at" TIMESTAMPTZ(6),
    "idempotency_key" TEXT DEFAULT (gen_random_uuid())::text,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "captures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "column_mappings" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "sheet_type" "sheet_type" NOT NULL,
    "column_letter" TEXT NOT NULL,
    "header_text" TEXT NOT NULL,
    "internal_field" TEXT NOT NULL,
    "is_mandatory" BOOLEAN DEFAULT false,

    CONSTRAINT "column_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exports" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "project_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT,
    "format" "export_format" NOT NULL,
    "sheet_type" "sheet_type" NOT NULL,
    "row_count" INTEGER NOT NULL,
    "exported_by" TEXT,
    "exported_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "line_items" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "project_id" TEXT NOT NULL,
    "zone_id" TEXT,
    "status" "line_item_status" DEFAULT 'PENDING_PASS1',
    "pass2_error" TEXT,
    "pass2_completed_at" TIMESTAMPTZ(6),
    "source_capture_id" TEXT,
    "pass2_status" TEXT DEFAULT 'PENDING',
    "pass2_confidence" DECIMAL(3,2),
    "spons_candidate_code" TEXT,
    "spons_candidate_label" TEXT,
    "spons_candidates" JSONB,
    "pass2_error_new" TEXT,
    "col_b_type" TEXT,
    "col_c_category" TEXT,
    "col_d_parent" TEXT,
    "col_e_object" TEXT,
    "col_f_equipment_configuration" TEXT,
    "col_g_description" TEXT,
    "col_h_equipment_present" TEXT,
    "col_i_prefilled_data_correct" TEXT,
    "col_j_commissioning_date" TIMESTAMPTZ(6),
    "col_k_manufacturer" TEXT,
    "col_l_model" TEXT,
    "col_m_serial_number" TEXT,
    "col_n_new_manufacturer" TEXT,
    "col_o_asset_alias" TEXT,
    "col_p_refrigerant_type" TEXT,
    "col_q_refrigerant_qty" DECIMAL,
    "col_r_new_apm_label_required" TEXT,
    "col_s_floor" TEXT,
    "col_t_location" TEXT,
    "col_u_asset_condition" "asset_condition",
    "col_v_asset_size" TEXT,
    "col_w_cibse_guidelines" TEXT,
    "col_x_spons_cost_excl_vat" DECIMAL,
    "col_y_observations" TEXT,
    "col_z_critical_spares" TEXT,
    "col_aa_cost_of_change_jayserv" DECIMAL,
    "col_ab_picture_taken" TEXT,
    "col_ac_risk_profile" TEXT,
    "col_p_property" TEXT,
    "col_q_amazon_maintenance" TEXT,
    "raw_transcript" TEXT,
    "transcript_timestamp" TIMESTAMPTZ(6),
    "unit_conversion_logic" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "name" TEXT NOT NULL,
    "client" TEXT,
    "site_address" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "owner_id" TEXT,
    "owner_name" TEXT,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spons_items" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "item_code" TEXT NOT NULL,
    "book" TEXT,
    "section" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "trade" TEXT,
    "rate" DECIMAL,
    "tags" TEXT[],
    "embedding" vector,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spons_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spons_matches" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "line_item_id" TEXT NOT NULL,
    "spons_item_id" TEXT NOT NULL,
    "similarity_score" DECIMAL,
    "is_selected" BOOLEAN DEFAULT false,
    "selected_by" TEXT,
    "selected_at" TIMESTAMPTZ(6),
    "unit_matches" BOOLEAN DEFAULT false,
    "trade_matches" BOOLEAN DEFAULT false,
    "action_matches" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spons_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_audit_action" ON "audit_entries"("action");

-- CreateIndex
CREATE INDEX "idx_audit_line_item" ON "audit_entries"("line_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "captures_idempotency_key_key" ON "captures"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_captures_idempotency" ON "captures"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_captures_line_item" ON "captures"("line_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "column_mappings_sheet_type_column_letter_key" ON "column_mappings"("sheet_type", "column_letter");

-- CreateIndex
CREATE INDEX "idx_exports_project" ON "exports"("project_id");

-- CreateIndex
CREATE INDEX "idx_line_items_project" ON "line_items"("project_id");

-- CreateIndex
CREATE INDEX "idx_line_items_status" ON "line_items"("status");

-- CreateIndex
CREATE INDEX "idx_line_items_zone" ON "line_items"("zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "spons_items_item_code_key" ON "spons_items"("item_code");

-- CreateIndex
CREATE INDEX "idx_spons_code" ON "spons_items"("item_code");

-- CreateIndex
CREATE INDEX "idx_spons_embedding" ON "spons_items"("embedding");

-- CreateIndex
CREATE INDEX "idx_spons_trade" ON "spons_items"("trade");

-- CreateIndex
CREATE INDEX "idx_spons_unit" ON "spons_items"("unit");

-- CreateIndex
CREATE INDEX "idx_spons_matches_line_item" ON "spons_matches"("line_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "spons_matches_line_item_id_spons_item_id_key" ON "spons_matches"("line_item_id", "spons_item_id");

-- CreateIndex
CREATE INDEX "idx_zones_project" ON "zones"("project_id");

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_line_item_id_fkey" FOREIGN KEY ("line_item_id") REFERENCES "line_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "captures" ADD CONSTRAINT "captures_line_item_id_fkey" FOREIGN KEY ("line_item_id") REFERENCES "line_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exports" ADD CONSTRAINT "exports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "spons_matches" ADD CONSTRAINT "spons_matches_line_item_id_fkey" FOREIGN KEY ("line_item_id") REFERENCES "line_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "spons_matches" ADD CONSTRAINT "spons_matches_spons_item_id_fkey" FOREIGN KEY ("spons_item_id") REFERENCES "spons_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

