# Autokirk MCP Wrapper (Enterprise Repo)

Enterprise-grade MCP wrapper that exposes the existing **Autokirk Systems** AIS Blueprint
endpoint as a Model Context Protocol (MCP) tool over Streamable HTTP.

This project is designed to be:

- ✅ GitHub-ready
- ✅ Render-ready
- ✅ Extensible for future Autokirk Engines, Modules, and Agents

---

## Architecture Overview

- **Autokirk Core Backend (existing)**  
  Hosted at: `https://autokirk-systems-od-1.onrender.com`  
  Provides the HTTP endpoint:

  - `POST /mcp/generate-ais-blueprint`

- **This MCP Wrapper (this repo)**  
  - Implements an MCP server with `@modelcontextprotocol/sdk`
  - Exposes one MCP tool: `generate_ais_blueprint`
  - When the tool is called, it forwards the request to the Autokirk backend
  - Returns the JSON result to the MCP client (e.g. ChatGPT Custom Connector)

- **MCP Client (ChatGPT Custom Connector)**  
  - Calls this MCP wrapper using Streamable HTTP at `/mcp`
  - Discovers tools via MCP protocol
  - Uses `generate_ais_blueprint` as a first-class tool

For additional internal docs, see:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/MCP_FLOW.md`](docs/MCP_FLOW.md)

---

## Requirements

- Node.js **18.x or newer**
- Access to the existing Autokirk backend at:
  `https://autokirk-systems-od-1.onrender.com`

---

## Local Development

```bash
npm install
npm start
```

By default this will start the MCP wrapper at:

- `http://localhost:3000/mcp`

You can then point an MCP client (such as ChatGPT Custom Connector, in local dev mode)
at that URL.

---

## Deploying to Render

1. Push this repository to GitHub.
2. In Render, create a **Web Service**:
   - **Environment:** Node
   - **Build Command:**
     ```bash
     npm install
     ```
   - **Start Command:**
     ```bash
     npm start
     ```

3. Once deployed, Render will give you a URL, for example:

   `https://autokirk-mcp-wrapper.onrender.com`

4. The MCP endpoint will be:

   `https://autokirk-mcp-wrapper.onrender.com/mcp`

5. In the ChatGPT **Custom Connector** UI, set:

   - **Name:** `Autokirk MCP`
   - **Description:** `AIS Blueprint Engine and Autokirk business OS tools.`
   - **MCP Server URL:** `https://autokirk-mcp-wrapper.onrender.com/mcp`
   - **Authentication:** `None`

---

## Repository Layout

```text
.
├─ package.json          # Node project definition
├─ server.mjs            # MCP wrapper server entrypoint
├─ .gitignore
├─ LICENSE
├─ README.md
├─ CONTRIBUTING.md
├─ CODE_OF_CONDUCT.md
├─ SECURITY.md
├─ docs/
│  ├─ ARCHITECTURE.md
│  └─ MCP_FLOW.md
└─ src/
   ├─ engines/
   ├─ agents/
   ├─ tools/
   └─ utils/
```

The `src/` tree is provided for future expansion as you add more Engines,
Agents, and Tools to the Autokirk OS ecosystem.

---

## Extending the MCP Wrapper

To add more tools (for example, operations, sales, billing, or reputation engines):

- Implement the upstream HTTP endpoints in the Autokirk backend
- Register additional tools in `server.mjs` that call those endpoints
- Optionally organize shared logic inside `src/tools/` and `src/utils/`

This repo is designed to evolve alongside the Autokirk Operating System
as it becomes the standard format for AI-run businesses.
