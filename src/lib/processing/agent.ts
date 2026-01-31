// Agentic LLM selection layer for SPONS candidates
// - Reason about transcript vs candidates
// - Auto-accept high-confidence matches
// - Ask for clarification on ambiguity
// - Flag low-confidence cases for QS review

import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface AgentInput {
  transcript: string
  normalized: {
    type?: string
    category?: string
    description?: string
    floor?: string
    location?: string
    assetCondition?: 'LOW' | 'MEDIUM' | 'HIGH'
    observations?: string
  }
  candidates: Array<{
    id: string
    item_code: string
    description: string
    unit: string
    trade?: string
    similarity_score: number
    unit_matches: boolean
    trade_matches: boolean
  }>
}

export interface AgentDecision {
  action: 'SELECT' | 'FLAG_FOR_REVIEW' | 'ASK_CLARIFICATION'
  selectedCandidateId?: string
  rationale: string
  confidence: number
  clarificationQuestion?: string
}

const CONFIDENCE_HIGH = 0.85
const CONFIDENCE_LOW = 0.65

/**
 * Run agentic LLM selection over retrieved SPONS candidates.
 * Enforces retrieval-only and zero-hallucination rules via tools.
 */
export async function runAgentSelection(input: AgentInput): Promise<AgentDecision> {
  const systemPrompt = `You are a SPONS matching specialist. Your job is to select the best SPONS item for a site observation.

RULES:
- ONLY select from the provided candidates. NEVER invent items.
- Prefer candidates with higher similarity scores.
- Ensure unit compatibility and trade match.
- If multiple candidates are close, pick the one that best matches the description.
- If no candidate is a good match, FLAG_FOR_REVIEW.
- If the transcript is ambiguous, ASK_CLARIFICATION.

CONFIDENCE:
- >0.85: SELECT (auto-accept)
- 0.65–0.85: SELECT with rationale
- <0.65: FLAG_FOR_REVIEW`

  const userPrompt = `TRANSCRIPT: "${input.transcript}"

NORMALIZED:
- Type: ${input.normalized.type || 'N/A'}
- Category: ${input.normalized.category || 'N/A'}
- Description: ${input.normalized.description || 'N/A'}
- Floor: ${input.normalized.floor || 'N/A'}
- Location: ${input.normalized.location || 'N/A'}
- Condition: ${input.normalized.assetCondition || 'N/A'}

CANDIDATES:
${input.candidates.map((c, i) => `
${i + 1}. ${c.item_code} — ${c.description}
   Unit: ${c.unit} | Trade: ${c.trade || 'N/A'}
   Similarity: ${c.similarity_score.toFixed(3)} | Unit match: ${c.unit_matches} | Trade match: ${c.trade_matches}
`).join('\n')}

Decide: SELECT a candidate, FLAG_FOR_REVIEW, or ASK_CLARIFICATION. Provide rationale and confidence (0–1).`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'selectCandidate',
          description: 'Select the best matching SPONS candidate',
          parameters: {
            type: 'object',
            properties: {
              candidateIndex: { type: 'number', description: 'Index of the selected candidate (1-based)' },
              rationale: { type: 'string', description: 'Why this candidate was chosen' },
              confidence: { type: 'number', description: 'Confidence 0–1' },
            },
            required: ['candidateIndex', 'rationale', 'confidence'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'flagForReview',
          description: 'Flag for QS review when no candidate is suitable',
          parameters: {
            type: 'object',
            properties: {
              rationale: { type: 'string', description: 'Why no candidate was suitable' },
              confidence: { type: 'number', description: 'Confidence 0–1' },
            },
            required: ['rationale', 'confidence'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'askClarification',
          description: 'Ask the user for clarification when the transcript is ambiguous',
          parameters: {
            type: 'object',
            properties: {
              question: { type: 'string', description: 'Clarification question to ask the user' },
              rationale: { type: 'string', description: 'Why clarification is needed' },
              confidence: { type: 'number', description: 'Confidence 0–1' },
            },
            required: ['question', 'rationale', 'confidence'],
          },
        },
      },
    ],
    tool_choice: 'auto',
  })

  const message = completion.choices[0].message
  if (!message.tool_calls) {
    throw new Error('Agent did not call a tool')
  }

  const toolCall = message.tool_calls[0]
  const args = JSON.parse('function' in toolCall ? toolCall.function.arguments : (toolCall as any).function?.arguments || '{}')

  const functionName = 'function' in toolCall ? toolCall.function.name : (toolCall as any).function?.name

  switch (functionName) {
    case 'selectCandidate': {
      const candidate = input.candidates[args.candidateIndex - 1]
      if (!candidate) throw new Error('Invalid candidate index')
      return {
        action: 'SELECT',
        selectedCandidateId: candidate.id,
        rationale: args.rationale,
        confidence: args.confidence,
      }
    }
    case 'flagForReview':
      return {
        action: 'FLAG_FOR_REVIEW',
        rationale: args.rationale,
        confidence: args.confidence,
      }
    case 'askClarification':
      return {
        action: 'ASK_CLARIFICATION',
        rationale: args.rationale,
        confidence: args.confidence,
        clarificationQuestion: args.question,
      }
    default:
      throw new Error('Unknown tool call')
  }
}
