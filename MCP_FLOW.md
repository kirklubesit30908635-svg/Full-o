# MCP Flow – Autokirk MCP Wrapper

This document outlines how MCP requests flow through the Autokirk MCP Wrapper.

## Endpoints

- MCP Wrapper exposed endpoint:
  - `POST /mcp`

- Upstream Autokirk backend endpoint:
  - `POST /mcp/generate-ais-blueprint`

## Request Flow

1. **MCP Client → MCP Wrapper**
   - The MCP client sends a tool invocation for `generate_ais_blueprint`
     to the wrapper's `/mcp` endpoint.

2. **Wrapper → Autokirk Backend**
   - The wrapper constructs an HTTP POST request to:
     `https://autokirk-systems-od-1.onrender.com/mcp/generate-ais-blueprint`
   - Body:
     ```json
     {
       "description": "Natural language business description..."
     }
     ```

3. **Autokirk Backend → Wrapper**
   - The backend responds with a JSON object containing:
     - `status`
     - `artifact_type`
     - `ais_version`
     - `output` (AIS blueprint)

4. **Wrapper → MCP Client**
   - The wrapper returns:
     - `content`: pretty-printed JSON as text
     - `structuredContent`: the raw JSON as `result`

The MCP client can then parse or display the data according to its own UX.
