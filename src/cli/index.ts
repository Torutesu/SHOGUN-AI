#!/usr/bin/env node
/**
 * SHOGUN CLI — command-line interface for SHOGUN Memory Layer.
 *
 * Usage:
 *   shogun search "who did I meet"
 *   shogun page get people/toru
 *   shogun page put people/toru --title "Toru" --truth "Founder"
 *   shogun stats
 *   shogun health
 *   shogun dream
 *   shogun export > backup.json
 *   shogun import < backup.json
 *   shogun mcp          # Start MCP server
 */

import { ShogunBrain } from "../brain.js";
import { OpenAIEmbeddingProvider } from "../embeddings/openai.js";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  const dataDir = process.env.SHOGUN_DATA_DIR ?? "./pgdata";
  const openaiKey = process.env.OPENAI_API_KEY;

  const brainOpts: { dataDir: string; embeddingProvider?: OpenAIEmbeddingProvider } = { dataDir };
  if (openaiKey) {
    brainOpts.embeddingProvider = new OpenAIEmbeddingProvider({ apiKey: openaiKey });
  }

  const brain = new ShogunBrain(brainOpts);
  await brain.init();

  try {
    switch (command) {
      case "search": {
        const query = args.slice(1).join(" ");
        if (!query) { console.error("Usage: shogun search <query>"); break; }
        const results = await brain.searchPipeline.keywordOnly(query, 10);
        for (const r of results) {
          console.log(`[${r.score.toFixed(3)}] ${r.page.title} (${r.page.slug})`);
        }
        break;
      }

      case "page": {
        const sub = args[1];
        if (sub === "get") {
          const slug = args[2];
          if (!slug) { console.error("Usage: shogun page get <slug>"); break; }
          const page = await brain.pages.getPage(slug);
          if (page) {
            console.log(await brain.pages.renderMarkdown(page));
          } else {
            console.error(`Page not found: ${slug}`);
          }
        } else if (sub === "list") {
          const pages = await brain.pages.listPages({ limit: 50 });
          for (const p of pages) {
            console.log(`${p.type.padEnd(8)} ${p.slug.padEnd(40)} ${p.title}`);
          }
        } else {
          console.error("Usage: shogun page [get|list] ...");
        }
        break;
      }

      case "stats": {
        const stats = await brain.getStats();
        console.log(JSON.stringify(stats, null, 2));
        break;
      }

      case "health": {
        const health = await brain.getHealth();
        console.log(JSON.stringify(health, null, 2));
        break;
      }

      case "dream": {
        console.log("Running Dream Cycle...");
        const result = await brain.runDreamCycle();
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case "export": {
        const { BrainExporter } = await import("../integrations/export.js");
        const exporter = new BrainExporter(brain);
        const json = await exporter.exportToJSON();
        process.stdout.write(json);
        break;
      }

      case "import": {
        const { BrainExporter } = await import("../integrations/export.js");
        const exporter = new BrainExporter(brain);
        let input = "";
        for await (const chunk of process.stdin) { input += chunk; }
        const result = await exporter.importFromJSON(input);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case "mcp": {
        // Start MCP server (doesn't return)
        await import("../mcp/server.js");
        return; // Don't close brain
      }

      default:
        console.log(`SHOGUN CLI v0.1.0

Commands:
  search <query>       Search memory
  page get <slug>      Get a page
  page list            List all pages
  stats                Brain statistics
  health               Health report
  dream                Run Dream Cycle
  export               Export brain to JSON (stdout)
  import               Import brain from JSON (stdin)
  mcp                  Start MCP server

Environment:
  SHOGUN_DATA_DIR      Data directory (default: ./pgdata)
  OPENAI_API_KEY       OpenAI API key (optional)
`);
    }
  } finally {
    await brain.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
