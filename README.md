# Autokirk MCP Wrapper

Streamable HTTP MCP wrapper for Autokirk.

## MCP Endpoint (required for ChatGPT Connector)
- POST /mcp  (JSON-RPC messages)
- GET  /mcp  (SSE stream)
- DELETE /mcp (end session)

## Upstream Backend
Set `AUTOKIRK_BACKEND_BASE` (default: https://autokirk-systems-od-1.onrender.com)

## Local
npm install
npm start
# http://localhost:3000/mcp

## Render
Build: npm install
Start: npm start

## Env Vars
- AUTOKIRK_BACKEND_BASE=https://autokirk-systems-od-1.onrender.com
- MCP_BEARER_TOKEN=   (optional)
- ENABLE_DNS_REBINDING_PROTECTION=false  (turn on later)
