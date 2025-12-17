import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// ====== CONFIG ======
const PORT = process.env.PORT || 3000;

// Your upstream Autokirk backend
const AUTOKIRK_BACKEND_BASE =
  process.env.AUTOKIRK_BACKEND_BASE || "https://autokirk-systems-od-1.onrender.com";

// Optional auth (recommended later). If set, require header: Authorization: Bearer <token>
const MCP_BEARER_TOKEN = process.env.MCP_BEARER_TOKEN || "";

// IMPORTANT: DNS rebinding protection is good hygiene, but can break some tooling.
// For initial connector bring-up, you can leave it OFF. Turn it ON once stable.
const ENABLE_DNS_REBINDING_PROTECTION =
  (process.env.ENABLE_DNS_REBINDING_PROTECTION || "false").toLowerCase() === "true";

// ====== APP ======
const app = express();
app.use(express.json({ limit: "2mb" }));

// Session -> transport map (simple in-memory). For scale, swap to Redis.
const transports = Object.create(null);

function authGuard(req, res) {
  if (!MCP_BEARER_TOKEN) return true;
  const auth = req.headers.authorization || "";
  const ok = auth === `Bearer ${MCP_BEARER_TOKEN}`;
  if (!ok) res.status(401).send("Unauthorized");
  return ok;
}

function createMcpServer() {
  const server = new McpServer({
    name: "autokirk-mcp-wrapper",
    version: "1.0.0"
  });

  // Tool: generate_ais_blueprint
  server.tool(
    "generate_ais_blueprint",
    {
      // Accept a flexible payload so your upstream can evolve without breaking the connector.
      // If you know the exact schema, tighten it.
      input: z.record(z.any()).default({})
    },
    async ({ input }) => {
      const url = `${AUTOKIRK_BACKEND_BASE}/mcp/generate-ais-blueprint`;

      const upstream = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input ?? {})
      });

      const text = await upstream.text();

      // If upstream returns JSON, keep it as-is; otherwise wrap raw text.
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }]
      };
    }
  );

  return server;
}

// POST /mcp — client -> server JSON-RPC messages
app.post("/mcp", async (req, res) => {
  if (!authGuard(req, res)) return;

  const sessionId = req.headers["mcp-session-id"];
  let transport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        transports[newSessionId] = transport;
      },
      enableDnsRebindingProtection: ENABLE_DNS_REBINDING_PROTECTION
    });

    transport.onclose = () => {
      if (transport.sessionId) delete transports[transport.sessionId];
    };

    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: Missing/invalid MCP session" },
      id: null
    });
    return;
  }

  // The SDK transport handles POST/GET/DELETE routing + SSE streaming when needed
  await transport.handleRequest(req, res, req.body);
});

// Shared handler for GET + DELETE
async function handleSessionRequest(req, res) {
  if (!authGuard(req, res)) return;

  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  await transports[sessionId].handleRequest(req, res);
}

// GET /mcp — SSE stream for server -> client messages
app.get("/mcp", handleSessionRequest);

// DELETE /mcp — session termination
app.delete("/mcp", handleSessionRequest);

app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "autokirk-mcp-wrapper",
    mcpEndpoint: "/mcp"
  });
});

app.listen(PORT, () => {
  console.log(`Autokirk MCP Wrapper listening on :${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
});

