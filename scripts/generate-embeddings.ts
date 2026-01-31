// Script to generate vector embeddings for SPONS items
// Run this after seeding SPONS data to enable vector similarity search

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

async function main() {
  console.log('Fetching SPONS items without embeddings...')

  // Get all SPONS items without embeddings
  const { data: items, error } = await supabase
    .from('spons_items')
    .select('id, item_code, description, trade, unit, tags')
    .is('embedding', null)

  if (error) {
    console.error('Error fetching items:', error)
    return
  }

  console.log(`Found ${items?.length || 0} items to process`)

  for (const item of items || []) {
    try {
      // Create text for embedding (combine description + trade + tags)
      const textForEmbedding = [
        item.description,
        item.trade,
        item.unit,
        ...(item.tags || []),
      ].filter(Boolean).join(' ')

      console.log(`Processing ${item.item_code}: ${item.description.slice(0, 50)}...`)

      // Generate embedding
      const embedding = await generateEmbedding(textForEmbedding)

      // Update the item with embedding
      const { error: updateError } = await supabase
        .from('spons_items')
        .update({ embedding })
        .eq('id', item.id)

      if (updateError) {
        console.error(`Error updating ${item.item_code}:`, updateError)
      } else {
        console.log(`✓ ${item.item_code}`)
      }

      // Rate limit: 3000 RPM for text-embedding-3-small
      await new Promise(resolve => setTimeout(resolve, 25))
    } catch (err) {
      console.error(`Error processing ${item.item_code}:`, err)
    }
  }

  console.log('Done!')
}

main()
