import express from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

const PORT = process.env.PORT || 3000;

// Upstream Autokirk backend (your existing system)
const AUTOKIRK_BACKEND_BASE =
  process.env.AUTOKIRK_BACKEND_BASE || "https://autokirk-systems-od-1.onrender.com";

// Optional: set this in Render later for production control-plane security
const MCP_BEARER_TOKEN = process.env.MCP_BEARER_TOKEN || "";

const app = express();
app.use(express.json({ limit: "2mb" }));

// In-memory session store (OK for v1). Upgrade to Redis when you scale.
const transports = Object.create(null);

function authGuard(req, res) {
  if (!MCP_BEARER_TOKEN) return true;
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${MCP_BEARER_TOKEN}`) {
    res.status(401).send("Unauthorized");
    return false;
  }
  return true;
}

function createMcpServer() {
  const server = new McpServer({ name: "autokirk-mcp-wrapper", version: "1.0.0" });

  server.tool(
    "generate_ais_blueprint",
    { input: z.record(z.any()).default({}) },
    async ({ input }) => {
      const url = `${AUTOKIRK_BACKEND_BASE}/mcp/generate-ais-blueprint`;

      const upstream = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input ?? {})
      });

      const text = await upstream.text();
      let payload;
      try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

      return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
    }
  );

  return server;
}

// POST /mcp: JSON-RPC messages (creates session on initialize)
app.post("/mcp", async (req, res) => {
  if (!authGuard(req, res)) return;

  const sessionId = req.headers["mcp-session-id"];
  let transport = sessionId ? transports[sessionId] : undefined;

  // Create a new session only on initialize
  if (!transport && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        transports[newSessionId] = transport;
      }
    });

    transport.onclose = () => {
      if (transport.sessionId) delete transports[transport.sessionId];
    };

    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);
  }

  if (!transport) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Missing/invalid MCP session. Initialize first." },
      id: null
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

// GET /mcp: SSE stream (connector expects text/event-stream here)
app.get("/mcp", async (req, res) => {
  if (!authGuard(req, res)) return;

  const sessionId = req.headers["mcp-session-id"];
  const transport = sessionId ? transports[sessionId] : undefined;

  if (!transport) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  await transport.handleRequest(req, res);
});

// DELETE /mcp: end session
app.delete("/mcp", async (req, res) => {
  if (!authGuard(req, res)) return;

  const sessionId = req.headers["mcp-session-id"];
  const transport = sessionId ? transports[sessionId] : undefined;

  if (!transport) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  await transport.handleRequest(req, res);
});

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "autokirk-mcp-wrapper", mcp: "/mcp" });
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));

