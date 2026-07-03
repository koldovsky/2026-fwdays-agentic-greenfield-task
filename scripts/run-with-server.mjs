// Start the production Next.js server, run a child command, then shut down.
// Used by check:a11y in qa:verify / CI when Playwright webServer is not active.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const PORT = process.env.PORT ?? "3010";
const BASE_URL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;
const childArgs = process.argv.slice(2);
if (childArgs.length === 0) {
  console.error("usage: node scripts/run-with-server.mjs <command> [args...]");
  process.exit(1);
}

if (!existsSync(".next/BUILD_ID")) {
  console.log("==> building app for server");
  const build = spawn("npm", ["run", "build"], { stdio: "inherit", shell: true });
  const buildCode = await new Promise((r) => build.on("close", r));
  if (buildCode !== 0) process.exit(buildCode ?? 1);
}

const server = spawn("npx", ["next", "start", "-p", PORT], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PORT },
});

async function ready() {
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(BASE_URL);
      if (res.status < 500) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`server not reachable at ${BASE_URL}`);
}

function shutdown() {
  server.kill("SIGTERM");
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(130);
});
process.on("SIGTERM", shutdown);

try {
  await ready();
  const child = spawn(childArgs[0], childArgs.slice(1), {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, BASE_URL, PORT },
  });
  const code = await new Promise((r) => child.on("close", r));
  shutdown();
  process.exit(code ?? 1);
} catch (e) {
  console.error(e.message);
  shutdown();
  process.exit(1);
}
