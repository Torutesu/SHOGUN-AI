import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ShogunBrain } from "../brain.js";
import { OpenAIEmbeddingProvider } from "../embeddings/openai.js";
import { RateLimiter } from "../security/rate-limiter.js";
import { sanitizeError, sanitizeDataDir } from "../security/validation.js";
import { PIIFilter } from "../security/pii.js";
import { logger } from "../logger.js";
import { defineReadTools } from "./tools/read.js";
import { defineWriteTools } from "./tools/write.js";
import { defineAdminTools } from "./tools/admin.js";

function zodToJsonSchema(zodSchema: unknown): Record<string, unknown> {
  const schema = zodSchema as { _def?: { shape?: () => Record<string, unknown> } };
  const shape = schema._def?.shape?.();
  if (!shape) return { type: "object", properties: {} };

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const field = value as { _def?: { typeName?: string; description?: string; innerType?: unknown; values?: string[] } };
    const prop: Record<string, unknown> = {};

    const innerDef = (field._def?.innerType as { _def?: { typeName?: string; description?: string; values?: string[] } })?._def;
    const typeName = innerDef?.typeName ?? field._def?.typeName;

    switch (typeName) {
      case "ZodString":
        prop.type = "string";
        break;
      case "ZodNumber":
        prop.type = "number";
        break;
      case "ZodBoolean":
        prop.type = "boolean";
        break;
      case "ZodArray": {
        prop.type = "array";
        // Attempt to resolve inner item type
        const arrayInner = (innerDef as unknown as { type?: { _def?: { typeName?: string } } })?.type?._def?.typeName;
        if (arrayInner === "ZodEnum") {
          prop.items = { type: "string" };
        } else {
          prop.items = { type: "string" };
        }
        break;
      }
      case "ZodEnum":
        prop.type = "string";
        prop.enum = innerDef?.values ?? field._def?.values;
        break;
      default:
        prop.type = "string";
    }

    if (field._def?.description || innerDef?.description) {
      prop.description = field._def?.description ?? innerDef?.description;
    }

    properties[key] = prop;

    if (field._def?.typeName !== "ZodOptional" && field._def?.typeName !== "ZodDefault") {
      required.push(key);
    }
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

export async function startMCPServer() {
  const rawDataDir = process.env.SHOGUN_DATA_DIR ?? "./pgdata";
  const dataDir = sanitizeDataDir(rawDataDir);
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const piiEnabled = process.env.SHOGUN_PII_REMOVAL === "true";

  // Validate API key format if provided
  if (openaiApiKey && !openaiApiKey.startsWith("sk-")) {
    logger.warn("OPENAI_API_KEY does not start with 'sk-' — may be invalid");
  }

  const brainOptions: { dataDir: string; embeddingProvider?: OpenAIEmbeddingProvider } = { dataDir };

  if (openaiApiKey) {
    brainOptions.embeddingProvider = new OpenAIEmbeddingProvider({
      apiKey: openaiApiKey,
    });
  }

  const brain = new ShogunBrain(brainOptions);
  await brain.init();

  // Security middleware
  const rateLimiter = new RateLimiter();
  const piiFilter = new PIIFilter({ enabled: piiEnabled });

  const server = new Server(
    {
      name: "shogun-memory",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const readTools = defineReadTools(brain);
  const writeTools = defineWriteTools(brain, piiFilter);
  const adminTools = defineAdminTools(brain);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTools: Record<string, {
    description: string;
    inputSchema: { parse: (input: any) => any };
    handler: (input: any) => Promise<any>;
  }> = {
    ...readTools,
    ...writeTools,
    ...adminTools,
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: Object.entries(allTools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.inputSchema),
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const tool = allTools[toolName];

    if (!tool) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: `Unknown tool: ${toolName}` }) }],
        isError: true,
      };
    }

    // Rate limiting
    if (!rateLimiter.check(toolName)) {
      const remaining = rateLimiter.remaining(toolName);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: `Rate limit exceeded for ${toolName}. Try again later.`,
            remaining,
          }),
        }],
        isError: true,
      };
    }

    try {
      const input = tool.inputSchema.parse(request.params.arguments ?? {});
      const result = await tool.handler(input);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error: unknown) {
      // Sanitize error before returning — no internal details leak
      const safeMessage = sanitizeError(error);
      logger.error(`Tool ${toolName} failed`, { error: safeMessage });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ error: safeMessage }),
        }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on("SIGINT", async () => {
    await brain.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await brain.close();
    process.exit(0);
  });
}

startMCPServer().catch((err) => {
  console.error("Failed to start MCP server:", err);
  process.exit(1);
});
