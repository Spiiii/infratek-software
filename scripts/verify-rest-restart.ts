import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const email = process.env.PAYLOAD_ADMIN_EMAIL;
const password = process.env.PAYLOAD_ADMIN_PASSWORD;
const port = 3110;
const origin = `http://127.0.0.1:${port}`;

if (!email || !password) {
  throw new Error("Admin credentials must be available in .env.local");
}

const nextBin = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url)
);

const waitForServer = async (): Promise<void> => {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/api/spike-pages?limit=1`);
      if (response.ok) return;
    } catch {
      // The dev server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error("Timed out waiting for the dev server");
};

const startServer = async (): Promise<ChildProcess> => {
  const child = spawn(process.execPath, [nextBin, "dev", "-p", String(port)], {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", () => undefined);
  child.stderr?.on("data", () => undefined);
  await waitForServer();
  return child;
};

const stopServer = async (child: ChildProcess): Promise<void> => {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 10_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
};

const jsonHeaders = { "Content-Type": "application/json" };
let server = await startServer();
let recordId: number | string | undefined;

try {
  const anonymousRead = await fetch(`${origin}/api/spike-pages?limit=1`);
  if (!anonymousRead.ok) throw new Error("Anonymous REST read should be public");

  const anonymousCreate = await fetch(`${origin}/api/spike-pages`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ title: "Must be rejected", slug: "anonymous-write" }),
  });
  if (![401, 403].includes(anonymousCreate.status)) {
    throw new Error(`Anonymous REST write returned ${anonymousCreate.status}`);
  }

  const login = await fetch(`${origin}/api/users/login`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) throw new Error(`Admin login failed with ${login.status}`);
  const loginBody = (await login.json()) as { token?: string };
  if (!loginBody.token) throw new Error("Admin login did not return a token");
  const authHeaders = {
    ...jsonHeaders,
    Authorization: `JWT ${loginBody.token}`,
  };

  const slug = `rest-restart-${Date.now()}`;
  const create = await fetch(`${origin}/api/spike-pages`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ title: "REST persistence check", slug }),
  });
  if (!create.ok) throw new Error(`Authenticated create failed with ${create.status}`);
  const created = (await create.json()) as { doc?: { id?: number | string }; id?: number | string };
  recordId = created.doc?.id ?? created.id;
  if (recordId === undefined) throw new Error("Create response did not contain an id");

  const update = await fetch(`${origin}/api/spike-pages/${recordId}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ title: "REST update passed" }),
  });
  if (!update.ok) throw new Error(`Authenticated update failed with ${update.status}`);

  await stopServer(server);
  server = await startServer();

  const persisted = await fetch(`${origin}/api/spike-pages/${recordId}`);
  if (!persisted.ok) throw new Error("Record did not persist after server restart");
  const persistedBody = (await persisted.json()) as { title?: string };
  if (persistedBody.title !== "REST update passed") {
    throw new Error("Persisted record did not contain the updated value");
  }

  const loginAfterRestart = await fetch(`${origin}/api/users/login`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ email, password }),
  });
  const loginAfterRestartBody = (await loginAfterRestart.json()) as { token?: string };
  if (!loginAfterRestart.ok || !loginAfterRestartBody.token) {
    throw new Error("Admin login failed after restart");
  }

  const remove = await fetch(`${origin}/api/spike-pages/${recordId}`, {
    method: "DELETE",
    headers: { Authorization: `JWT ${loginAfterRestartBody.token}` },
  });
  if (!remove.ok) throw new Error(`Authenticated delete failed with ${remove.status}`);

  console.log("REST authorization, CRUD, and restart persistence checks passed.");
} finally {
  await stopServer(server);
}
