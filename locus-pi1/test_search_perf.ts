import { db } from "./src/main/infrastructure/database/db";
import { properties } from "./src/main/infrastructure/database/schema/properties";
import { DrizzlePropertyRepository } from "./src/main/infrastructure/repositories/DrizzlePropertyRepository";
import { randomUUID } from "crypto";

async function run() {
  console.log("Seeding 10,000 properties...");
  const batchSize = 1000;
  
  for (let i = 0; i < 10; i++) {
    const batch = [];
    for (let j = 0; j < batchSize; j++) {
      const idx = i * batchSize + j;
      const title = `Imovel ${idx}`;
      const address = `Rua ${idx}`;
      const neighborhood = idx % 2 === 0 ? "Centro" : "Bairro Alto";
      const bedrooms = (idx % 4) + 1;
      const price = 100000 + (idx * 100);
      const searchNormalized = `${title} ${address} ${neighborhood}`.toLowerCase();
      
      batch.push({
        id: randomUUID(),
        title,
        address,
        neighborhood,
        bedrooms,
        price,
        status: "CADASTRADO" as const,
        searchNormalized,
        description: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    await db.insert(properties).values(batch);
  }

  console.log("Seeding completed.");

  const repo = new DrizzlePropertyRepository();
  
  console.log("Measuring search performance...");
  
  const start = performance.now();
  
  const result = await repo.search({
    q: "Centro",
    bedrooms: 2,
    priceMin: 150000,
    orderBy: "price_desc",
    limit: 50,
    page: 1
  });

  const end = performance.now();
  
  console.log(`Found ${result.total} items. Returned ${result.items.length}.`);
  console.log(`Time taken: ${(end - start).toFixed(2)} ms`);
  
  const explain = await db.run(require('drizzle-orm').sql`EXPLAIN QUERY PLAN SELECT * FROM properties WHERE status = 'CADASTRADO' AND neighborhood = 'Centro'`);
  console.log("EXPLAIN QUERY PLAN:", explain);
}

run().catch(console.error).then(() => process.exit(0));
