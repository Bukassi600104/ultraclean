import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { setTimeout as wait } from "node:timers/promises";

const servicePort = 4785;
const appPort = 4137;
const base = "http://localhost:" + appPort;
const inserts = [];
const emails = [];

const services = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const payload = JSON.parse(Buffer.concat(chunks).toString() || "{}");
  response.setHeader("Content-Type", "application/json");
  if (request.method === "POST" && request.url.startsWith("/rest/v1/leads")) {
    inserts.push(payload);
    if (payload.name === "Database Failure Fixture") {
      response.writeHead(400);
      response.end(JSON.stringify({ message: "Simulated fixture write failure", code: "fixture" }));
      return;
    }
    response.writeHead(201);
    response.end(JSON.stringify({ id: "fixture-lead-id" }));
    return;
  }
  if (request.method === "POST" && request.url === "/mail/emails") {
    emails.push(payload);
    response.end(JSON.stringify({ id: "fixture-email-id" }));
    return;
  }
  response.writeHead(404);
  response.end("{}");
});

const lead = {
  business: "primefield",
  name: "Browser Test Fixture",
  email: "buyer@example.test",
  phone: "+234 800 000 0000",
  service: "buying",
  specialRequests: "Product: Catfish\nQuantity: 5 kg\nNotes: Test only",
};

async function send(data) {
  return fetch(base + "/api/submit-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function settle(predicate) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await predicate()) return;
    await wait(160);
  }
  throw new Error("Timed out waiting for the fixture");
}

async function inApp(preview, exercise) {
  const app = spawn(process.execPath, [
    "node_modules/next/dist/bin/next", "start", "-H", "localhost", "-p", String(appPort),
  ], {
    env: {
      ...process.env,
      VERCEL_ENV: preview ? "preview" : "production",
      VERCEL_GIT_COMMIT_REF: preview ? "codex/primefield-public-redesign" : "main",
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:" + servicePort,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-anon-key-for-public-qa",
      SUPABASE_SERVICE_ROLE_KEY: "local-service-key-for-public-qa",
      RESEND_BASE_URL: "http://localhost:" + servicePort + "/mail",
      RESEND_API_KEY: "re_local_fixture",
      ADMIN_EMAIL: "admin@example.test",
      UPSTASH_REDIS_URL: "",
      UPSTASH_REDIS_TOKEN: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let appOutput = "";
  app.stdout.on("data", (data) => { appOutput += data; });
  app.stderr.on("data", (data) => { appOutput += data; });
  try {
    await settle(async () => (await fetch(base + "/").catch(() => null))?.ok);
    await exercise();
  } catch (error) {
    console.error(appOutput);
    throw error;
  } finally {
    if (app.exitCode === null && app.signalCode === null) {
      const closed = once(app, "exit");
      app.kill();
      await closed;
    }
  }
}

services.listen(servicePort, "localhost");
await once(services, "listening");

try {
  await inApp(true, async () => {
    const invalid = await send({ ...lead, email: "not-an-email" });
    assert.equal(invalid.status, 400);
    assert.ok((await invalid.json()).errors.email.length);
    const preview = await send(lead);
    assert.equal(preview.status, 201);
    assert.deepEqual(await preview.json(), { success: true, leadId: null, preview: true });
    assert.equal(inserts.length, 0);
    assert.equal(emails.length, 0);
  });

  await inApp(false, async () => {
    const response = await send(lead);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { success: true, leadId: "fixture-lead-id" });
    assert.equal(inserts.length, 1);
    assert.deepEqual(
      { business: inserts[0].business, source: inserts[0].source, service: inserts[0].service, notes: inserts[0].notes, status: inserts[0].status },
      { business: "primefield", source: "website", service: "buying", notes: "Requests: " + lead.specialRequests, status: "new" },
    );
    await settle(() => emails.length === 2);
    const confirmation = emails.find((mail) => mail.subject === "We received your Primefield enquiry");
    const notification = emails.find((mail) => mail.subject.includes("Primefield enquiry from"));
    assert.ok(confirmation && notification);
    assert.equal(confirmation.reply_to, "orders@primefieldagric.com");
    assert.match(confirmation.from, /^Primefield Agri-Business </);
    assert.match(confirmation.html, /Thanks for contacting Primefield/);
    assert.doesNotMatch(confirmation.html, /24 hours|ULTRACLEAN/);
    assert.equal(notification.reply_to, lead.email);
    assert.match(notification.html, /Product: Catfish/);

    const failed = await send({ ...lead, name: "Database Failure Fixture" });
    assert.equal(failed.status, 500);
    assert.equal(emails.length, 2);

    const other = await send({ ...lead, business: "ultratidy", service: "House cleaning", specialRequests: "Fixture" });
    assert.equal(other.status, 201);
    await settle(() => emails.length === 4);
    assert.ok(emails.find((mail) => mail.subject === "Thank you for contacting UltraTidy!"));
    assert.equal(inserts.at(-1).business, "ultratidy");
  });

  console.log("PASS preview validation with zero side effects, isolated storage, Primefield buyer and admin emails, storage failure, existing UltraTidy email");
} finally {
  services.close();
}
