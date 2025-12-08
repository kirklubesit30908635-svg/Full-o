# Autokirk MCP Wrapper – Architecture

The Autokirk MCP Wrapper acts as a bridge between:

- The **Autokirk Core Backend**, which exposes business logic and AIS blueprint generation.
- An **MCP client** such as ChatGPT Custom Connector, which speaks the Model Context Protocol.

## Components

- **MCP Server (`server.mjs`)**
  - Built using `@modelcontextprotocol/sdk`
  - Registers tools that correspond to Autokirk capabilities
  - Currently exposes one tool: `generate_ais_blueprint`

- **Streamable HTTP Transport**
  - Implements the MCP server over HTTP using `StreamableHTTPServerTransport`
  - Allows MCP clients to send requests over HTTP POST to `/mcp`

- **Autokirk Backend (Upstream)**
  - URL: `https://autokirk-systems-od-1.onrender.com`
  - Endpoint:
    - `POST /mcp/generate-ais-blueprint`

## Data Flow (High Level)

1. MCP client calls the `generate_ais_blueprint` tool.
2. MCP Wrapper forwards the call to the Autokirk backend.
3. Autokirk backend generates an AIS-style business blueprint JSON.
4. MCP Wrapper returns the result as both:
   - Human-readable text
   - Structured JSON (`structuredContent`)
5. MCP client uses the result inside the conversation or workflow.

This pattern can be replicated for additional Engines and Agents as the
Autokirk OS expands.
