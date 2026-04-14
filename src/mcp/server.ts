import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ShogunBrain } from "../brain.js";
import { OpenAIEmbeddingProvider } from "../embeddings/openai.js";
import { defineReadTools } from "./tools/read.js";
import { defineWriteTools } from "./tools/write.js";
import { defineAdminTools } from "./tools/admin.js";

function zodToJsonSchema(zodSchema: any): Record<string, unknown> {
  // Simple zod-to-JSON-schema converter for MCP tool registration
  const shape = zodSchema._def?.shape?.();
  if (!shape) return { type: "object", properties: {} };

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const field = value as any;
    const prop: Record<string, unknown> = {};

    const innerType = field._def?.innerType ?? field;
    const typeName = innerType._def?.typeName ?? field._def?.typeName;

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
      case "ZodArray":
        prop.type = "array";
        prop.items = { type: "string" };
        break;
      case "ZodEnum":
        prop.type = "string";
        prop.enum = innerType._def?.values ?? field._def?.values;
        break;
      default:
        prop.type = "string";
    }

    if (field._def?.description || innerType._def?.description) {
      prop.description = field._def?.description ?? innerType._def?.description;
    }

    properties[key] = prop;

    // Check if field is required (not optional)
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
  const dataDir = process.env.SHOGUN_DATA_DIR ?? "./pgdata";
  const openaiApiKey = process.env.OPENAI_API_KEY;

  const brainOptions: any = { dataDir };

  if (openaiApiKey) {
    brainOptions.embeddingProvider = new OpenAIEmbeddingProvider({
      apiKey: openaiApiKey,
    });
  }

  const brain = new ShogunBrain(brainOptions);
  await brain.init();

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

  // Collect all tools
  const readTools = defineReadTools(brain);
  const writeTools = defineWriteTools(brain);
  const adminTools = defineAdminTools(brain);

  const allTools: Record<string, { description: string; inputSchema: any; handler: (input: any) => Promise<any> }> = {
    ...readTools,
    ...writeTools,
    ...adminTools,
  };

  // Register tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: Object.entries(allTools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.inputSchema),
      })),
    };
  });

  // Register tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const tool = allTools[toolName];

    if (!tool) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: `Unknown tool: ${toolName}` }),
          },
        ],
        isError: true,
      };
    }

    try {
      const input = tool.inputSchema.parse(request.params.arguments ?? {});
      const result = await tool.handler(input);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: error.message ?? "Unknown error",
            }),
          },
        ],
        isError: true,
      };
    }
  });

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    await brain.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await brain.close();
    process.exit(0);
  });
}

// Auto-start when run directly
startMCPServer().catch((err) => {
  console.error("Failed to start MCP server:", err);
  process.exit(1);
});
