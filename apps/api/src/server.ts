import "dotenv/config";
import { createApp } from "./index";
import { seedDemoDataIfEnabled } from "./domain/demoSeed";

const DEFAULT_PORT = 3000;

async function startServer(): Promise<void> {
  const app = createApp();
  const port = Number(process.env.PORT) || DEFAULT_PORT;

  const seedResult = await seedDemoDataIfEnabled();

  if (seedResult.seeded) {
    console.log(`Seeded ${seedResult.itemCount} demo items for local warehouse walkthrough.`);
  }

  app.listen(port, () => {
    console.log(`Opsly API is running on http://localhost:${port}`);
  });
}

void startServer();
