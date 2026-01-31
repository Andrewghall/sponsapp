// Seed synthetic SPONS data for pipeline testing
// Per spec: 200-500 realistic items covering containment, lighting, power, small civils, structural

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const syntheticSponsItems = [
  // CONTAINMENT (Electrical)
  { item_code: 'CONT-001', book: 'Electrical', section: 'Containment', description: 'Cable tray, galvanised steel, 300mm wide', unit: 'lm', trade: 'Electrical', rate: 45.00, tags: ['cable tray', 'containment', 'galvanised'] },
  { item_code: 'CONT-002', book: 'Electrical', section: 'Containment', description: 'Cable tray, galvanised steel, 450mm wide', unit: 'lm', trade: 'Electrical', rate: 55.00, tags: ['cable tray', 'containment', 'galvanised'] },
  { item_code: 'CONT-003', book: 'Electrical', section: 'Containment', description: 'Cable tray, galvanised steel, 600mm wide', unit: 'lm', trade: 'Electrical', rate: 68.00, tags: ['cable tray', 'containment', 'galvanised'] },
  { item_code: 'CONT-004', book: 'Electrical', section: 'Containment', description: 'Cable ladder, heavy duty, 300mm wide', unit: 'lm', trade: 'Electrical', rate: 75.00, tags: ['cable ladder', 'containment', 'heavy duty'] },
  { item_code: 'CONT-005', book: 'Electrical', section: 'Containment', description: 'Cable ladder, heavy duty, 450mm wide', unit: 'lm', trade: 'Electrical', rate: 95.00, tags: ['cable ladder', 'containment', 'heavy duty'] },
  { item_code: 'CONT-006', book: 'Electrical', section: 'Containment', description: 'Trunking, PVC, 100x50mm', unit: 'lm', trade: 'Electrical', rate: 18.00, tags: ['trunking', 'pvc', 'containment'] },
  { item_code: 'CONT-007', book: 'Electrical', section: 'Containment', description: 'Trunking, steel, 150x75mm', unit: 'lm', trade: 'Electrical', rate: 32.00, tags: ['trunking', 'steel', 'containment'] },
  { item_code: 'CONT-008', book: 'Electrical', section: 'Containment', description: 'Conduit, galvanised steel, 20mm', unit: 'lm', trade: 'Electrical', rate: 8.50, tags: ['conduit', 'galvanised', 'containment'] },
  { item_code: 'CONT-009', book: 'Electrical', section: 'Containment', description: 'Conduit, galvanised steel, 25mm', unit: 'lm', trade: 'Electrical', rate: 10.50, tags: ['conduit', 'galvanised', 'containment'] },
  { item_code: 'CONT-010', book: 'Electrical', section: 'Containment', description: 'Busbar trunking, 400A', unit: 'lm', trade: 'Electrical', rate: 450.00, tags: ['busbar', 'trunking', 'containment'] },

  // LIGHTING
  { item_code: 'LITE-001', book: 'Electrical', section: 'Lighting', description: 'LED panel, 600x600mm, 40W', unit: 'nr', trade: 'Electrical', rate: 85.00, tags: ['led', 'panel', 'lighting'] },
  { item_code: 'LITE-002', book: 'Electrical', section: 'Lighting', description: 'LED high bay, 150W', unit: 'nr', trade: 'Electrical', rate: 220.00, tags: ['led', 'high bay', 'lighting', 'warehouse'] },
  { item_code: 'LITE-003', book: 'Electrical', section: 'Lighting', description: 'LED high bay, 200W', unit: 'nr', trade: 'Electrical', rate: 280.00, tags: ['led', 'high bay', 'lighting', 'warehouse'] },
  { item_code: 'LITE-004', book: 'Electrical', section: 'Lighting', description: 'Emergency luminaire, maintained', unit: 'nr', trade: 'Electrical', rate: 125.00, tags: ['emergency', 'luminaire', 'lighting'] },
  { item_code: 'LITE-005', book: 'Electrical', section: 'Lighting', description: 'Emergency luminaire, non-maintained', unit: 'nr', trade: 'Electrical', rate: 95.00, tags: ['emergency', 'luminaire', 'lighting'] },
  { item_code: 'LITE-006', book: 'Electrical', section: 'Lighting', description: 'Bulkhead fitting, LED, IP65', unit: 'nr', trade: 'Electrical', rate: 65.00, tags: ['bulkhead', 'led', 'lighting', 'ip65'] },
  { item_code: 'LITE-007', book: 'Electrical', section: 'Lighting', description: 'Fluorescent batten, twin 1500mm', unit: 'nr', trade: 'Electrical', rate: 45.00, tags: ['fluorescent', 'batten', 'lighting'] },
  { item_code: 'LITE-008', book: 'Electrical', section: 'Lighting', description: 'LED strip, 5m roll', unit: 'nr', trade: 'Electrical', rate: 35.00, tags: ['led', 'strip', 'lighting'] },
  { item_code: 'LITE-009', book: 'Electrical', section: 'Lighting', description: 'Floodlight, LED, 100W', unit: 'nr', trade: 'Electrical', rate: 150.00, tags: ['floodlight', 'led', 'lighting', 'external'] },
  { item_code: 'LITE-010', book: 'Electrical', section: 'Lighting', description: 'Floodlight, LED, 200W', unit: 'nr', trade: 'Electrical', rate: 220.00, tags: ['floodlight', 'led', 'lighting', 'external'] },

  // POWER (Distribution)
  { item_code: 'POWR-001', book: 'Electrical', section: 'Power', description: 'Distribution board, 12 way, TPN', unit: 'nr', trade: 'Electrical', rate: 450.00, tags: ['distribution board', 'db', 'power'] },
  { item_code: 'POWR-002', book: 'Electrical', section: 'Power', description: 'Distribution board, 18 way, TPN', unit: 'nr', trade: 'Electrical', rate: 580.00, tags: ['distribution board', 'db', 'power'] },
  { item_code: 'POWR-003', book: 'Electrical', section: 'Power', description: 'Distribution board, 24 way, TPN', unit: 'nr', trade: 'Electrical', rate: 720.00, tags: ['distribution board', 'db', 'power'] },
  { item_code: 'POWR-004', book: 'Electrical', section: 'Power', description: 'Socket outlet, twin 13A', unit: 'nr', trade: 'Electrical', rate: 28.00, tags: ['socket', 'outlet', 'power', '13a'] },
  { item_code: 'POWR-005', book: 'Electrical', section: 'Power', description: 'Socket outlet, single 13A', unit: 'nr', trade: 'Electrical', rate: 22.00, tags: ['socket', 'outlet', 'power', '13a'] },
  { item_code: 'POWR-006', book: 'Electrical', section: 'Power', description: 'Isolator switch, 100A, 3 pole', unit: 'nr', trade: 'Electrical', rate: 185.00, tags: ['isolator', 'switch', 'power'] },
  { item_code: 'POWR-007', book: 'Electrical', section: 'Power', description: 'MCB, 32A, Type B', unit: 'nr', trade: 'Electrical', rate: 12.00, tags: ['mcb', 'breaker', 'power'] },
  { item_code: 'POWR-008', book: 'Electrical', section: 'Power', description: 'RCBO, 32A, 30mA', unit: 'nr', trade: 'Electrical', rate: 45.00, tags: ['rcbo', 'breaker', 'power', 'rcd'] },
  { item_code: 'POWR-009', book: 'Electrical', section: 'Power', description: 'Commando socket, 32A, 3P+N+E', unit: 'nr', trade: 'Electrical', rate: 65.00, tags: ['commando', 'socket', 'power', 'industrial'] },
  { item_code: 'POWR-010', book: 'Electrical', section: 'Power', description: 'Commando socket, 63A, 3P+N+E', unit: 'nr', trade: 'Electrical', rate: 95.00, tags: ['commando', 'socket', 'power', 'industrial'] },

  // DOORS
  { item_code: 'DOOR-001', book: 'Building', section: 'Doors', description: 'Fire door, single leaf, FD30', unit: 'nr', trade: 'Doors', rate: 450.00, tags: ['fire door', 'fd30', 'single'] },
  { item_code: 'DOOR-002', book: 'Building', section: 'Doors', description: 'Fire door, single leaf, FD60', unit: 'nr', trade: 'Doors', rate: 580.00, tags: ['fire door', 'fd60', 'single'] },
  { item_code: 'DOOR-003', book: 'Building', section: 'Doors', description: 'Fire door, double leaf, FD30', unit: 'nr', trade: 'Doors', rate: 850.00, tags: ['fire door', 'fd30', 'double'] },
  { item_code: 'DOOR-004', book: 'Building', section: 'Doors', description: 'Fire door, double leaf, FD60', unit: 'nr', trade: 'Doors', rate: 1100.00, tags: ['fire door', 'fd60', 'double'] },
  { item_code: 'DOOR-005', book: 'Building', section: 'Doors', description: 'Steel personnel door, single', unit: 'nr', trade: 'Doors', rate: 380.00, tags: ['steel door', 'personnel', 'single'] },
  { item_code: 'DOOR-006', book: 'Building', section: 'Doors', description: 'Steel personnel door, double', unit: 'nr', trade: 'Doors', rate: 650.00, tags: ['steel door', 'personnel', 'double'] },
  { item_code: 'DOOR-007', book: 'Building', section: 'Doors', description: 'Roller shutter door, manual, 3m wide', unit: 'nr', trade: 'Doors', rate: 2200.00, tags: ['roller shutter', 'manual', 'loading'] },
  { item_code: 'DOOR-008', book: 'Building', section: 'Doors', description: 'Roller shutter door, electric, 3m wide', unit: 'nr', trade: 'Doors', rate: 3500.00, tags: ['roller shutter', 'electric', 'loading'] },
  { item_code: 'DOOR-009', book: 'Building', section: 'Doors', description: 'Sectional overhead door, 4m wide', unit: 'nr', trade: 'Doors', rate: 4200.00, tags: ['sectional', 'overhead', 'loading'] },
  { item_code: 'DOOR-010', book: 'Building', section: 'Doors', description: 'Door closer, overhead, standard', unit: 'nr', trade: 'Doors', rate: 85.00, tags: ['door closer', 'ironmongery'] },

  // HVAC
  { item_code: 'HVAC-001', book: 'Mechanical', section: 'HVAC', description: 'AHU, packaged, 5000 m3/hr', unit: 'nr', trade: 'HVAC', rate: 12500.00, tags: ['ahu', 'air handling unit', 'hvac'] },
  { item_code: 'HVAC-002', book: 'Mechanical', section: 'HVAC', description: 'AHU, packaged, 10000 m3/hr', unit: 'nr', trade: 'HVAC', rate: 22000.00, tags: ['ahu', 'air handling unit', 'hvac'] },
  { item_code: 'HVAC-003', book: 'Mechanical', section: 'HVAC', description: 'Fan coil unit, ceiling mounted', unit: 'nr', trade: 'HVAC', rate: 850.00, tags: ['fcu', 'fan coil', 'hvac'] },
  { item_code: 'HVAC-004', book: 'Mechanical', section: 'HVAC', description: 'Split system AC, wall mounted, 5kW', unit: 'nr', trade: 'HVAC', rate: 1200.00, tags: ['split', 'ac', 'hvac', 'cooling'] },
  { item_code: 'HVAC-005', book: 'Mechanical', section: 'HVAC', description: 'Split system AC, wall mounted, 7kW', unit: 'nr', trade: 'HVAC', rate: 1500.00, tags: ['split', 'ac', 'hvac', 'cooling'] },
  { item_code: 'HVAC-006', book: 'Mechanical', section: 'HVAC', description: 'Extract fan, axial, 300mm', unit: 'nr', trade: 'HVAC', rate: 280.00, tags: ['fan', 'extract', 'axial', 'hvac'] },
  { item_code: 'HVAC-007', book: 'Mechanical', section: 'HVAC', description: 'Extract fan, centrifugal, 500mm', unit: 'nr', trade: 'HVAC', rate: 650.00, tags: ['fan', 'extract', 'centrifugal', 'hvac'] },
  { item_code: 'HVAC-008', book: 'Mechanical', section: 'HVAC', description: 'Ductwork, galvanised, rectangular per m2', unit: 'm2', trade: 'HVAC', rate: 85.00, tags: ['duct', 'ductwork', 'galvanised', 'hvac'] },
  { item_code: 'HVAC-009', book: 'Mechanical', section: 'HVAC', description: 'Grille, supply, 600x300mm', unit: 'nr', trade: 'HVAC', rate: 45.00, tags: ['grille', 'supply', 'hvac'] },
  { item_code: 'HVAC-010', book: 'Mechanical', section: 'HVAC', description: 'Damper, fire, 300x300mm', unit: 'nr', trade: 'HVAC', rate: 180.00, tags: ['damper', 'fire', 'hvac'] },

  // MECHANICAL (Pumps, Valves)
  { item_code: 'MECH-001', book: 'Mechanical', section: 'Pipework', description: 'Pump, centrifugal, 2.2kW', unit: 'nr', trade: 'Mechanical', rate: 850.00, tags: ['pump', 'centrifugal', 'mechanical'] },
  { item_code: 'MECH-002', book: 'Mechanical', section: 'Pipework', description: 'Pump, centrifugal, 5.5kW', unit: 'nr', trade: 'Mechanical', rate: 1450.00, tags: ['pump', 'centrifugal', 'mechanical'] },
  { item_code: 'MECH-003', book: 'Mechanical', section: 'Pipework', description: 'Gate valve, 50mm', unit: 'nr', trade: 'Mechanical', rate: 65.00, tags: ['valve', 'gate', 'mechanical'] },
  { item_code: 'MECH-004', book: 'Mechanical', section: 'Pipework', description: 'Gate valve, 100mm', unit: 'nr', trade: 'Mechanical', rate: 145.00, tags: ['valve', 'gate', 'mechanical'] },
  { item_code: 'MECH-005', book: 'Mechanical', section: 'Pipework', description: 'Ball valve, 25mm', unit: 'nr', trade: 'Mechanical', rate: 28.00, tags: ['valve', 'ball', 'mechanical'] },
  { item_code: 'MECH-006', book: 'Mechanical', section: 'Pipework', description: 'Ball valve, 50mm', unit: 'nr', trade: 'Mechanical', rate: 55.00, tags: ['valve', 'ball', 'mechanical'] },
  { item_code: 'MECH-007', book: 'Mechanical', section: 'Pipework', description: 'Copper pipe, 22mm', unit: 'lm', trade: 'Mechanical', rate: 18.00, tags: ['pipe', 'copper', 'mechanical'] },
  { item_code: 'MECH-008', book: 'Mechanical', section: 'Pipework', description: 'Copper pipe, 28mm', unit: 'lm', trade: 'Mechanical', rate: 24.00, tags: ['pipe', 'copper', 'mechanical'] },
  { item_code: 'MECH-009', book: 'Mechanical', section: 'Pipework', description: 'Steel pipe, 50mm', unit: 'lm', trade: 'Mechanical', rate: 45.00, tags: ['pipe', 'steel', 'mechanical'] },
  { item_code: 'MECH-010', book: 'Mechanical', section: 'Pipework', description: 'Radiator, double panel, 1200x600mm', unit: 'nr', trade: 'Mechanical', rate: 220.00, tags: ['radiator', 'heating', 'mechanical'] },

  // SMALL CIVILS
  { item_code: 'CIVL-001', book: 'Building', section: 'Civils', description: 'Concrete pad, 1m x 1m x 150mm', unit: 'nr', trade: 'Civils', rate: 180.00, tags: ['concrete', 'pad', 'civils'] },
  { item_code: 'CIVL-002', book: 'Building', section: 'Civils', description: 'Concrete plinth, 600x600x300mm', unit: 'nr', trade: 'Civils', rate: 120.00, tags: ['concrete', 'plinth', 'civils'] },
  { item_code: 'CIVL-003', book: 'Building', section: 'Civils', description: 'Kerb edging, precast', unit: 'lm', trade: 'Civils', rate: 25.00, tags: ['kerb', 'edging', 'civils'] },
  { item_code: 'CIVL-004', book: 'Building', section: 'Civils', description: 'Drainage channel, 100mm', unit: 'lm', trade: 'Civils', rate: 45.00, tags: ['drainage', 'channel', 'civils'] },
  { item_code: 'CIVL-005', book: 'Building', section: 'Civils', description: 'Manhole cover, 600x600mm', unit: 'nr', trade: 'Civils', rate: 85.00, tags: ['manhole', 'cover', 'civils'] },

  // STRUCTURAL
  { item_code: 'STRC-001', book: 'Building', section: 'Structural', description: 'Steel beam, UB 203x133', unit: 'lm', trade: 'Structural', rate: 120.00, tags: ['steel', 'beam', 'structural'] },
  { item_code: 'STRC-002', book: 'Building', section: 'Structural', description: 'Steel column, UC 152x152', unit: 'lm', trade: 'Structural', rate: 95.00, tags: ['steel', 'column', 'structural'] },
  { item_code: 'STRC-003', book: 'Building', section: 'Structural', description: 'Mezzanine floor, per m2', unit: 'm2', trade: 'Structural', rate: 180.00, tags: ['mezzanine', 'floor', 'structural'] },
  { item_code: 'STRC-004', book: 'Building', section: 'Structural', description: 'Handrail, galvanised steel', unit: 'lm', trade: 'Structural', rate: 85.00, tags: ['handrail', 'steel', 'structural'] },
  { item_code: 'STRC-005', book: 'Building', section: 'Structural', description: 'Staircase, steel, straight flight', unit: 'nr', trade: 'Structural', rate: 2500.00, tags: ['staircase', 'steel', 'structural'] },
]

async function main() {
  console.log('Seeding synthetic SPONS data...')

  for (const item of syntheticSponsItems) {
    await prisma.spons_items.upsert({
      where: { item_code: item.item_code },
      update: item,
      create: item,
    })
  }

  console.log(`Seeded ${syntheticSponsItems.length} SPONS items`)

  // Seed column mappings for LCY3
  const lcy3Mappings = [
    { sheet_type: 'LCY3' as const, column_letter: 'B', header_text: 'Type', internal_field: 'col_b_type', is_mandatory: true },
    { sheet_type: 'LCY3' as const, column_letter: 'C', header_text: 'Category', internal_field: 'col_c_category', is_mandatory: true },
    { sheet_type: 'LCY3' as const, column_letter: 'D', header_text: 'Parent', internal_field: 'col_d_parent', is_mandatory: false },
    { sheet_type: 'LCY3' as const, column_letter: 'E', header_text: 'Object', internal_field: 'col_e_object', is_mandatory: false },
    { sheet_type: 'LCY3' as const, column_letter: 'G', header_text: 'Description', internal_field: 'col_g_description', is_mandatory: true },
    { sheet_type: 'LCY3' as const, column_letter: 'S', header_text: 'Floor', internal_field: 'col_s_floor', is_mandatory: true },
    { sheet_type: 'LCY3' as const, column_letter: 'T', header_text: 'Location', internal_field: 'col_t_location', is_mandatory: true },
    { sheet_type: 'LCY3' as const, column_letter: 'X', header_text: 'SPONS – Cost of change – Excl VAT', internal_field: 'col_x_spons_cost_excl_vat', is_mandatory: true },
    { sheet_type: 'LCY3' as const, column_letter: 'Y', header_text: 'Observations', internal_field: 'col_y_observations', is_mandatory: true },
  ]

  for (const mapping of lcy3Mappings) {
    await prisma.column_mappings.upsert({
      where: {
        sheet_type_column_letter: {
          sheet_type: mapping.sheet_type,
          column_letter: mapping.column_letter,
        },
      },
      update: mapping,
      create: mapping,
    })
  }

  console.log(`Seeded ${lcy3Mappings.length} column mappings`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
