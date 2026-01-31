import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function run() {
  console.log("Starting SPONS embedding job…");

  // Fetch all items (Prisma can't filter by Unsupported("vector") fields)
  const items = await prisma.spons_items.findMany();

  console.log(`Found ${items.length} items`);

  // We'll process all items since we can't filter by embedding field
  for (const item of items) {
    const text = [
      item.description,
      item.trade,
      item.unit,
      item.section,
      Array.isArray(item.tags) ? item.tags.join(" ") : item.tags,
    ]
      .filter(Boolean)
      .join(" | ");

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    // Use raw SQL to update embedding since Prisma doesn't support vector type
    await prisma.$executeRaw`
      UPDATE spons_items 
      SET embedding = ${embeddingResponse.data[0].embedding}::vector 
      WHERE id = ${item.id}
    `;

    console.log(`Embedded: ${item.item_code}`);
  }

  console.log("✅ All SPONS items embedded");

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});