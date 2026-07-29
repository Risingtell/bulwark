/**
 * Thin MCP client wrapper around KeeperHub's remote MCP server. Bulwark is
 * the calling agent; KeeperHub is the execution layer — every write this
 * agent makes goes through here, never through a local signer.
 *
 * API surface verified against the installed @modelcontextprotocol/sdk
 * (1.30.0) source, not assumed from docs: Client.connect(transport),
 * client.callTool(params), client.listTools(). Auth is requestInit.headers
 * on the transport, not a bare `headers` option.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const KEEPERHUB_MCP_URL = "https://app.keeperhub.com/mcp";

export async function connectKeeperHub(apiKey: string) {
  const transport = new StreamableHTTPClientTransport(new URL(KEEPERHUB_MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
  });
  const client = new Client({ name: "bulwark", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);
  return client;
}

export async function callTool(client: Client, name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) {
    const text = Array.isArray(result.content) ? result.content.map((c: any) => c.text ?? "").join(" ") : "";
    throw new Error(`KeeperHub tool ${name} failed: ${text}`);
  }
  return result;
}
