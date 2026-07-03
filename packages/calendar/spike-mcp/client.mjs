// Spike for openspec/changes/slots tasks.md 4.4 — NOT production code.
// Attempts to consume the @cocal/google-calendar-mcp server as an MCP client
// (stdio transport) from Node, using the DEMO calendar's service-account
// credentials, to see whether server-side auth accepts them at all.
//
// Do NOT print file contents of the credentials JSON — only pass the path.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
// The server expects GOOGLE_OAUTH_CREDENTIALS to point at an OAuth "Desktop
// app" client-secret JSON (shape: { installed: { client_id, client_secret,
// redirect_uris } } or { web: {...} }). We deliberately point it at our
// service-account JSON to observe how it fails against the wrong shape —
// this is the concrete auth-complexity finding for criterion 1.
const credsPath = path.resolve(
  repoRoot,
  process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "./secrets/does-not-exist.json"
);

function now() {
  return performance.now();
}

async function main() {
  console.log("[spike] repoRoot:", repoRoot);
  console.log("[spike] credsPath (service-account, wrong shape for this server):", credsPath);

  const t0 = now();
  const transport = new StdioClientTransport({
    command: "node",
    args: [
      path.resolve(here, "node_modules/@cocal/google-calendar-mcp/build/index.js"),
    ],
    env: {
      ...process.env,
      GOOGLE_OAUTH_CREDENTIALS: credsPath,
    },
  });

  const client = new Client({ name: "kamerton-spike", version: "0.0.0" });

  try {
    await client.connect(transport);
    const tConnect = now();
    console.log(`[spike] connected in ${(tConnect - t0).toFixed(0)}ms`);

    const tools = await client.listTools();
    const tTools = now();
    console.log(`[spike] listTools() in ${(tTools - tConnect).toFixed(0)}ms`);
    console.log(
      "[spike] tools:",
      tools.tools.map((t) => t.name)
    );

    // Try to find a free/busy-equivalent tool and call it against the DEMO
    // calendar to see whether the wrong-shaped credential is accepted or
    // rejected, and how the error surfaces through the MCP protocol.
    const freeBusyTool = tools.tools.find((t) => /free.?busy/i.test(t.name));
    if (freeBusyTool) {
      const tCallStart = now();
      try {
        const result = await client.callTool({
          name: freeBusyTool.name,
          arguments: {
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            timeMin: new Date().toISOString(),
            timeMax: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          },
        });
        console.log(
          `[spike] ${freeBusyTool.name} call in ${(now() - tCallStart).toFixed(0)}ms ->`,
          JSON.stringify(result).slice(0, 500)
        );
      } catch (err) {
        console.log(
          `[spike] ${freeBusyTool.name} call FAILED in ${(now() - tCallStart).toFixed(0)}ms ->`,
          err?.message ?? err
        );
      }
    } else {
      console.log("[spike] no free/busy-shaped tool found in listTools() output");
    }
  } catch (err) {
    console.log(
      `[spike] connect/listTools FAILED after ${(now() - t0).toFixed(0)}ms ->`,
      err?.message ?? err
    );
  } finally {
    await client.close().catch(() => {});
    process.exit(0);
  }
}

main();
