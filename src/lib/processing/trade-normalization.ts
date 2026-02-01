// Trade validation and normalization utilities

export const allowedTrades = ["Fire", "HVAC", "Mechanical", "Electrical", "General"] as const

export type Trade = typeof allowedTrades[number]

/**
 * Normalizes and validates trade values from LLM responses
 */
export function normalizeTrade(value: string | undefined): Trade {
  if (!value) return "General"
  
  const trimmed = value.trim().toLowerCase()
  
  // Direct matches
  const directMatches: Record<string, Trade> = {
    "fire": "Fire",
    "fire safety": "Fire",
    "fire protection": "Fire",
    "hvac": "HVAC",
    "heating": "HVAC",
    "ventilation": "HVAC",
    "air conditioning": "HVAC",
    "mechanical": "Mechanical",
    "mech": "Mechanical",
    "plumbing": "Mechanical",
    "electrical": "Electrical",
    "elec": "Electrical",
    "general": "General",
    "building": "General",
    "civil": "General",
    "architectural": "General"
  }
  
  // Check direct matches first
  if (directMatches[trimmed]) {
    return directMatches[trimmed]
  }
  
  // Check partial matches
  if (trimmed.includes("fire")) return "Fire"
  if (trimmed.includes("hvac") || trimmed.includes("heat") || trimmed.includes("vent")) return "HVAC"
  if (trimmed.includes("mech") || trimmed.includes("plumb")) return "Mechanical"
  if (trimmed.includes("elec")) return "Electrical"
  
  // Fallback to General
  return "General"
}

/**
 * Validates and normalizes structured fields from LLM responses
 */
export function normalizeStructuredFields(fields: {
  trade?: string
  asset?: string
  action?: string
  condition?: string
}): {
  trade: Trade
  asset: string
  action: string
  condition: string
} {
  return {
    trade: normalizeTrade(fields.trade),
    asset: fields.asset?.trim() || "Unknown",
    action: fields.action?.trim() || "repair",
    condition: fields.condition?.trim() || "defective"
  }
}
