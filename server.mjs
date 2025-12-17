import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// --- Configuration -------------------------------------------------------

// Existing Autokirk backend on Render.
const AUTOKIRK_BASE_URL = "https://autokirk-systems-od-1.onrender.com";

// --- Create MCP Server ---------------------------------------------------

const server = new McpServer({
  name: "autokirk-mcp",
  version: "1.0.0"
});

// Register a single tool that proxies to the AIS blueprint endpoint.
server.registerTool(
  "generate_ais_blueprint",
  {
    title: "Generate AIS Blueprint",
    description:
      "Generate an AIS-style business blueprint JSON from a natural language description.",
    inputSchema: {
      description: z.string()
        
    outputSchema: {
      // We accept any JSON payload from upstream; callers can introspect it.
      result: z.unknown()
    }
  },
  async ({ description }) => {
    // Call the existing Autokirk backend.
    const url = `${AUTOKIRK_BASE_URL}/mcp/generate-ais-blueprint`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ description })
    });

    if (!response.ok) {
      let message = `Upstream Autokirk server error: ${response.status}`;
      try {
        const text = await response.text();
        if (text) {
          message = text;
        }
      } catch {
        // ignore text parsing errors
      }
      throw new Error(message);
    }

    const data = await response.json();

    // MCP tools return both human-readable content and structuredContent.
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2)
        }
      ],
      structuredContent: {
        result: data
      }
    };
  }
);

// --- Express + Streamable HTTP transport ---------------------------------

const app = express();
app.use(express.json());

// Single MCP endpoint for Streamable HTTP.
app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  res.on("close", () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const PORT = parseInt(process.env.PORT || "3000", 10);

app
  .listen(PORT, () => {
    console.log(`Autokirk MCP Wrapper running on http://localhost:${PORT}/mcp`);
  })
  .on("error", (error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
