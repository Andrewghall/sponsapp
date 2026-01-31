# SPONSApp - System Architecture

## What We Are Building

A **mobile-first warehouse survey application** where:

1. Engineer walks a warehouse site
2. Speaks observations into their phone
3. System transcribes speech → extracts entities → matches to SPONS pricing
4. Outputs QS-grade Excel/PDF lifecycle costing reports

---

## Core Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ENGINEER ON SITE                                │
│                                                                             │
│  📱 Mobile App (PWA)                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. Tap Record                                                       │   │
│  │  2. Speak: "Two fire doors, FD30, ground floor loading bay,         │   │
│  │            poor condition, needs replacement"                        │   │
│  │  3. Audio saved locally (IndexedDB) - OFFLINE FIRST                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PASS 1: CAPTURE (Deepgram)                          │
│                                                                             │
│  • Streaming transcription when ONLINE                                      │
│  • Batch transcription when OFFLINE (queued)                               │
│                                                                             │
│  OUTPUT (raw, NO inference):                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  transcript: "Two fire doors, FD30, ground floor loading bay..."    │   │
│  │  rawQuantities: [{ value: 2, unit: "nr" }]                          │   │
│  │  rawComponents: ["fire door", "fd30"]                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ⚠️  NO pricing, NO SPONS matching, NO assumptions at this stage           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PASS 2: AGENTIC NORMALISATION                            │
│                                                                             │
│  Agents perform:                                                            │
│  • Synonym resolution: "fire door" → Type: "Door"                          │
│  • Unit conversion: "two" → 2, "metres" → "m"                              │
│  • Taxonomy mapping: "FD30" → Category: "Doors & Ironmongery"              │
│  • Location extraction: "ground floor loading bay" → Floor + Location      │
│  • Condition mapping: "poor condition" → AssetCondition: "HIGH" risk       │
│                                                                             │
│  OUTPUT (normalised, validated):                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  colB_type: "Door"                                                   │   │
│  │  colC_category: "Doors & Ironmongery"                               │   │
│  │  colG_description: "2 x Fire door, FD30"                            │   │
│  │  colS_floor: "Ground Floor"                                         │   │
│  │  colT_location: "Loading Bay"                                       │   │
│  │  colU_assetCondition: "HIGH"                                        │   │
│  │  colY_observations: "Two fire doors, FD30, ground floor..."         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ✅ Mandatory field validation before proceeding                            │
│  ❌ If missing mandatory fields → prompt user for input                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SPONS MATCHING (Vector Database)                         │
│                                                                             │
│  RETRIEVAL ONLY - NEVER GENERATE PRICES                                     │
│                                                                             │
│  Step 1: Filter by TRADE and UNIT (hard constraints)                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  WHERE trade = 'Doors' AND unit = 'nr'                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Step 2: Vector similarity search (pgvector)                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SELECT *, 1 - (embedding <=> query_embedding) as similarity        │   │
│  │  FROM spons_items                                                    │   │
│  │  WHERE trade = 'Doors' AND unit = 'nr'                              │   │
│  │  ORDER BY embedding <=> query_embedding                              │   │
│  │  LIMIT 10                                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Step 3: Return candidates to user                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Candidate 1: DOOR-001 "Fire door, single leaf, FD30" £450 (92%)    │   │
│  │  Candidate 2: DOOR-002 "Fire door, single leaf, FD60" £580 (78%)    │   │
│  │  Candidate 3: DOOR-003 "Fire door, double leaf, FD30" £850 (71%)    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ⚠️  If NO candidates match trade+unit: mark as UNMATCHED                  │
│  ⚠️  If confidence < 80%: require QS review                                │
│  ⚠️  NEVER guess or generate a price                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         QS REVIEW (if needed)                               │
│                                                                             │
│  QS/Commercial user can:                                                    │
│  • Select from candidates                                                   │
│  • Mark as UNMATCHED (no suitable SPONS item)                              │
│  • Approve final selection                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EXPORT                                         │
│                                                                             │
│  LCY Excel Workbook with:                                                   │
│  • Data sheet: Exact column mapping (B-AC for LCY3)                        │
│  • Audit sheet: Full traceability per line item                            │
│                                                                             │
│  Audit trail includes:                                                      │
│  • Original spoken sentence                                                 │
│  • Timestamp                                                                │
│  • Unit conversion logic applied                                           │
│  • All SPONS candidates retrieved                                          │
│  • Final selection made                                                     │
│  • Who approved it                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

---

## Vector Database (pgvector in Supabase)

We use **pgvector** extension in Supabase Postgres for semantic similarity search.

### How it works:

1. **SPONS items have embeddings** - Each SPONS item description is converted to a 1536-dimension vector using OpenAI embeddings (or similar)

2. **Query embedding** - When matching, we convert the line item description to a vector

3. **Similarity search** - pgvector finds the most similar SPONS items using cosine distance

### Vector indexes we maintain:

| Index | Purpose |
|-------|---------|
| Asset taxonomy | Map spoken terms to standard types |
| Intervention templates | Common maintenance actions |
| Synthetic SPONS index | SPONS items with embeddings |
| Approved historical mappings | Previously approved matches |

---

## Two-Pass Verification Model

### Why Two Passes?

**Pass 1 (Capture)** is DUMB on purpose:
- Just transcribe
- Extract obvious quantities and components
- NO inference, NO assumptions
- This ensures we capture exactly what was said

**Pass 2 (Normalisation)** is SMART:
- Resolve synonyms
- Convert units
- Map to taxonomy
- Validate mandatory fields
- This is where we apply business logic

### Separation of Concerns:

```
PASS 1                          PASS 2
───────                         ───────
Raw transcript                  Normalised fields
Raw quantities                  Converted units
Raw components                  Resolved types/categories
                               Validated mandatory fields
                               Ready for SPONS matching
```

---

## Offline-First Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE DEVICE                            │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Audio     │    │  IndexedDB  │    │   Zustand   │        │
│  │  Recording  │───▶│   Storage   │◀──▶│    Store    │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                            │                                    │
│                            │ Sync when online                   │
│                            ▼                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE CLOUD                             │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Storage   │    │  Postgres   │    │  pgvector   │        │
│  │   (Audio)   │    │   (Data)    │    │  (Vectors)  │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### Connection States:

| State | Indicator | Behaviour |
|-------|-----------|-----------|
| Online | 🟢 Live transcription | Stream to Deepgram, save to Supabase |
| Offline | 🟠 Recording safely | Save audio locally, queue for sync |
| Syncing | 🟢 Processing backlog | Upload queued items, process transcription |

---

## Non-Negotiables (from Build Pack)

1. ✅ **Offline-first capture** - Audio always saved locally first
2. ✅ **Automatic online/offline switching** - Detect connectivity, adapt behaviour
3. ✅ **Two-pass processing model** - Pass 1 (capture) + Pass 2 (normalisation)
4. ✅ **Retrieval-only SPONS matching** - Never generate prices
5. ✅ **No AI-generated pricing** - Only select from retrieved candidates
6. ✅ **Full audit trace per line item** - Every action logged
7. ✅ **Prelive and live environments** - Separate Supabase projects

---

## File Locations

| Component | Location |
|-----------|----------|
| Prisma Schema | `/prisma/schema.prisma` |
| Supabase SQL | `/supabase/schema.sql` (creating now) |
| Synthetic SPONS | `/supabase/seed-spons.sql` (creating now) |
| Pass 1 Logic | `/src/lib/processing/pass1.ts` |
| Pass 2 Logic | `/src/lib/processing/pass2.ts` |
| SPONS Matching | `/src/lib/spons/match.ts` |
| Offline DB | `/src/lib/offline-db.ts` |
| Deepgram | `/src/lib/deepgram.ts` |
| Excel Export | `/src/app/api/export/excel/route.ts` |
