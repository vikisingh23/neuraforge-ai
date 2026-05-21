#!/usr/bin/env node
/**
 * NeuraForge Hub — Unified MCP Server
 * Shared services layer for multi-agent pipelines.
 * NOT an orchestrator. A toolbox that enforces rules.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { stateTools } from "./blades/state.mjs";
import { governanceTools } from "./blades/governance.mjs";
import { analyticsTools } from "./blades/analytics.mjs";
import { criticalTools } from "./blades/critical.mjs";
import { lockTools } from "./blades/locks.mjs";

const server = new Server({ name: "neuraforge-hub", version: "3.0.0" }, {
  capabilities: { tools: {} }
});

// Register all blade tools
const allTools = [
  ...stateTools,
  ...governanceTools,
  ...analyticsTools,
  ...criticalTools,
  ...lockTools,
];

server.setRequestHandler("tools/list", async () => ({
  tools: allTools.map(t => ({ name: t.name, description: t.description, inputSchema: t.schema }))
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  const tool = allTools.find(t => t.name === name);
  if (!tool) return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  try {
    const result = await tool.handler(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${err.message}` }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
