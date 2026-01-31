// Pass 1: Capture - Extract raw entities only
// NO inference, NO pricing, NO SPONS matching

import { prisma } from '@/lib/prisma'

export interface Pass1Result {
  transcript: string
  rawQuantities: { value: number; unit: string }[]
  rawComponents: string[]
  timestamp: Date
}

// Process a capture through Pass 1
export async function processPass1(captureId: string): Promise<Pass1Result> {
  const capture = await prisma.capture.findUnique({
    where: { id: captureId },
    include: { lineItem: true },
  })

  if (!capture || !capture.transcript) {
    throw new Error('Capture not found or no transcript')
  }

  const transcript = capture.transcript
  const rawQuantities = extractQuantities(transcript)
  const rawComponents = extractComponents(transcript)

  // Update capture with extracted data
  await prisma.capture.update({
    where: { id: captureId },
    data: {
      rawQuantities,
      rawComponents,
    },
  })

  // Update line item status
  await prisma.lineItem.update({
    where: { id: capture.lineItemId },
    data: {
      status: 'PASS1_COMPLETE',
      rawTranscript: transcript,
      transcriptTimestamp: new Date(),
    },
  })

  // Create audit entry
  await prisma.auditEntry.create({
    data: {
      lineItemId: capture.lineItemId,
      action: 'PASS1_COMPLETE',
      spokenSentence: transcript,
      metadata: {
        rawQuantities,
        rawComponents,
      },
    },
  })

  return {
    transcript,
    rawQuantities,
    rawComponents,
    timestamp: new Date(),
  }
}

// Extract raw quantities - NO inference
function extractQuantities(transcript: string): { value: number; unit: string }[] {
  const quantities: { value: number; unit: string }[] = []
  const lowerTranscript = transcript.toLowerCase()

  // Number word mapping
  const numberWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
  }

  // Patterns for quantity extraction
  const patterns = [
    // "2 doors", "10 metres", "5 units"
    /(\d+)\s*(doors?|units?|metres?|meters?|m\b|nr\b|no\b|each|ea|linear\s*m|lm|sqm|m2|m²|items?|pieces?|sets?)/gi,
    // "two doors", "three units"
    /(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)\s*(doors?|units?|metres?|meters?|items?)/gi,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(lowerTranscript)) !== null) {
      const numStr = match[1].toLowerCase()
      const value = numberWords[numStr] ?? parseInt(numStr)
      if (!isNaN(value)) {
        quantities.push({
          value,
          unit: normalizeUnit(match[2]),
        })
      }
    }
  }

  return quantities
}

// Normalize unit strings
function normalizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    door: 'nr', doors: 'nr',
    unit: 'nr', units: 'nr',
    item: 'nr', items: 'nr',
    piece: 'nr', pieces: 'nr',
    set: 'nr', sets: 'nr',
    each: 'nr', ea: 'nr',
    no: 'nr', nr: 'nr',
    metre: 'm', metres: 'm', meter: 'm', meters: 'm', m: 'm',
    'linear m': 'lm', lm: 'lm',
    sqm: 'm2', m2: 'm2', 'm²': 'm2',
  }
  return unitMap[unit.toLowerCase()] || unit.toLowerCase()
}

// Extract raw components - NO inference
function extractComponents(transcript: string): string[] {
  const components: string[] = []
  const lowerTranscript = transcript.toLowerCase()

  // Equipment terms to detect (ordered by specificity)
  const equipmentTerms = [
    // Specific first
    'air handling unit', 'ahu',
    'fire door', 'steel door', 'timber door', 'double door',
    'distribution board', 'db',
    'cable tray', 'cable ladder',
    'socket outlet', 'twin socket',
    // General
    'door', 'chiller', 'boiler', 'pump', 'fan', 'motor',
    'valve', 'damper', 'duct', 'pipe', 'conduit', 'trunking',
    'lighting', 'luminaire', 'light fitting',
    'panel', 'switch', 'socket', 'containment', 'busbar',
    'radiator', 'heater', 'cooler', 'compressor',
    'transformer', 'inverter', 'vfd', 'drive',
  ]

  for (const term of equipmentTerms) {
    if (lowerTranscript.includes(term)) {
      // Avoid duplicates (e.g., don't add 'door' if 'fire door' already added)
      const alreadyHasSpecific = components.some(c => c.includes(term) || term.includes(c))
      if (!alreadyHasSpecific) {
        components.push(term)
      }
    }
  }

  return components
}

export { extractQuantities, extractComponents }
