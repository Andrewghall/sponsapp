// Synthetic SPONS data for retrieval testing (mirrors real SPONS schema)
// Run with: npx tsx prisma/seed-synthetic-spons.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const syntheticItems = [
  // Carpentry
  { item_code: 'C-001', description: 'Fire door with intumescent strip', unit: 'NR', trade: 'Carpentry', book: 'C1', section: 'Doors', rate: 450.00, tags: ['fire', 'door', 'intumescent'] },
  { item_code: 'C-002', description: 'Standard timber door', unit: 'NR', trade: 'Carpentry', book: 'C1', section: 'Doors', rate: 220.00, tags: ['timber', 'door'] },
  { item_code: 'C-003', description: 'Steel door frame', unit: 'NR', trade: 'Carpentry', book: 'C1', section: 'Frames', rate: 180.00, tags: ['steel', 'frame', 'door'] },
  // Mechanical
  { item_code: 'M-001', description: 'Air handling unit AHU-01', unit: 'NR', trade: 'Mechanical', book: 'M1', section: 'AHU', rate: 3200.00, tags: ['ahu', 'air', 'handling'] },
  { item_code: 'M-002', description: 'Chiller water cooled 200kW', unit: 'NR', trade: 'Mechanical', book: 'M2', section: 'Chillers', rate: 14500.00, tags: ['chiller', 'water', 'cooled'] },
  { item_code: 'M-003', description: 'Boiler gas fired 500kW', unit: 'NR', trade: 'Mechanical', book: 'M2', section: 'Boilers', rate: 8900.00, tags: ['boiler', 'gas', 'fired'] },
  { item_code: 'M-004', description: 'Circulation pump 15kW', unit: 'NR', trade: 'Mechanical', book: 'M3', section: 'Pumps', rate: 1100.00, tags: ['pump', 'circulation'] },
  { item_code: 'M-005', description: 'Centrifugal fan 5kW', unit: 'NR', trade: 'Mechanical', book: 'M3', section: 'Fans', rate: 850.00, tags: ['fan', 'centrifugal'] },
  // Electrical
  { item_code: 'E-001', description: 'Distribution board 3 phase 16 ways', unit: 'NR', trade: 'Electrical', book: 'E1', section: 'DB', rate: 720.00, tags: ['distribution', 'board', 'phase'] },
  { item_code: 'E-002', description: 'LED luminaire 600x600', unit: 'NR', trade: 'Electrical', book: 'E2', section: 'Lighting', rate: 95.00, tags: ['led', 'luminaire', 'lighting'] },
  { item_code: 'E-003', description: 'Cable tray ladder type 300mm', unit: 'M', trade: 'Electrical', book: 'E3', section: 'Containment', rate: 28.50, tags: ['cable', 'tray', 'ladder'] },
  { item_code: 'E-004', description: 'PVC conduit 20mm', unit: 'M', trade: 'Electrical', book: 'E3', section: 'Containment', rate: 3.20, tags: ['pvc', 'conduit'] },
  { item_code: 'E-005', description: 'Steel trunking 100x50mm', unit: 'M', trade: 'Electrical', book: 'E3', section: 'Containment', rate: 22.75, tags: ['steel', 'trunking'] },
]

async function seedSyntheticSpons() {
  console.log('Seeding synthetic SPONS items...')

  for (const item of syntheticItems) {
    // Simple embedding simulation: use description hash as placeholder
    // In production, you would use a real embedding model
    const embedding = simulateEmbedding(item.description)

    // Use raw SQL to insert with pgvector embedding (Prisma doesn’t support vector in schema)
    await prisma.$executeRaw`
      INSERT INTO spons_items (item_code, description, unit, trade, book, section, rate, tags, embedding)
      VALUES (${item.item_code}, ${item.description}, ${item.unit}, ${item.trade}, ${item.book}, ${item.section}, ${item.rate}, ${item.tags}, ${embedding}::vector)
      ON CONFLICT (item_code) DO UPDATE SET
        description = EXCLUDED.description,
        unit = EXCLUDED.unit,
        trade = EXCLUDED.trade,
        book = EXCLUDED.book,
        section = EXCLUDED.section,
        rate = EXCLUDED.rate,
        tags = EXCLUDED.tags
    `
  }

  console.log('Synthetic SPONS items seeded:', syntheticItems.length)
}

// Very naive embedding simulation (hash-based vector)
// Replace with real embeddings in production
function simulateEmbedding(text: string): number[] {
  const dim = 384
  const vec = new Array(dim).fill(0)
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) & 0xffffffff
  }
  const rng = new SeededRNG(hash)
  for (let i = 0; i < dim; i++) {
    vec[i] = (rng.next() - 0.5) * 2
  }
  return vec
}

class SeededRNG {
  private seed: number
  constructor(seed: number) {
    this.seed = seed
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }
}

seedSyntheticSpons()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
