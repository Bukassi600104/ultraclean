import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const [mode, endpoint] = process.argv.slice(2);
assert.ok(
  ["canonical", "preview"].includes(mode) && endpoint,
  "Usage: node scripts/test-primefield-routing.mjs canonical|preview http://127.0.0.1:3000",
);

const target = new URL(endpoint);
const preview = mode === "preview";
if (!preview) {
  assert.ok(["127.0.0.1", "localhost"].includes(target.hostname), "Canonical host simulation requires a local server");
}

const canonical = "https://primefieldagric.com";
const publicRoutes = [
  "/",
  "/products",
  "/products/catfish",
  "/products/goats",
  "/products/broiler-chickens",
  "/products/seasonal-produce",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
];

function get(path, host = preview ? target.host : "primefieldagric.com") {
  const url = new URL(path, target);
  const request = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = request(url, { headers: { Host: host } }, (res) => {
      res.setEncoding("utf8");
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("error", reject);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.setTimeout(25000, () => req.destroy(new Error(`Request timed out for ${host}${path}`)));
    req.on("error", reject);
    req.end();
  });
}

const titles = new Set();
const descriptions = new Set();
for (const path of publicRoutes) {
  const { status, headers, body } = await get(path);
  assert.equal(status, 200, headers.location ? `${path} redirected to ${headers.location}` : path);
  const expectedUrl = new URL(path, canonical).href;
  const actualCanonical = body.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert.ok(actualCanonical, `Canonical URL for ${path}`);
  assert.equal(new URL(actualCanonical).href, expectedUrl, `Canonical URL for ${path}`);
  if (path === "/") {
    for (const legacyHash of ["about", "products", "contact"]) {
      assert.ok(body.includes(`id="${legacyHash}"`), `Homepage link #${legacyHash} is preserved`);
    }
  }

  const title = body.match(/<title>([^<]+)<\/title>/i)?.[1];
  const description = body.match(/<meta name="description" content="([^"]+)"/i)?.[1];
  assert.ok(title && !titles.has(title), `Unique title for ${path}`);
  assert.ok(description && !descriptions.has(description), `Unique description for ${path}`);
  titles.add(title);
  descriptions.add(description);

  const robotsHeader = String(headers["x-robots-tag"] ?? "");
  if (preview) {
    assert.match(robotsHeader, /noindex/i, `Noindex header for ${path}`);
  } else {
    assert.doesNotMatch(robotsHeader, /noindex/i, `Indexable header for ${path}`);
    assert.doesNotMatch(body, /<meta name="robots" content="[^"]*noindex/i, `Indexable metadata for ${path}`);
  }
}

const { status: robotsStatus, body: robots } = await get("/robots.txt");
assert.equal(robotsStatus, 200);
const { status: sitemapStatus, body: sitemap } = await get("/sitemap.xml");
assert.equal(sitemapStatus, 200);
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.match(robots, /Allow: \/\s*$/m);
assert.match(robots, /Disallow: \/api\//);
if (preview) {
  assert.doesNotMatch(robots, /Disallow: \/\s*$/m, "Crawlers can read preview noindex headers");
  assert.doesNotMatch(robots, /Sitemap:/i);
  assert.equal(sitemapLocations.length, 0);
} else {
  assert.ok(robots.includes(`Sitemap: ${canonical}/sitemap.xml`));
  assert.deepEqual(sitemapLocations.sort(), publicRoutes.map((path) => new URL(path, canonical).href).sort());
}

const legacyPath = "/primefield/products/catfish?source=legacy";
const canonicalPath = "/products/catfish?source=legacy";
const legacyHome = await get("/primefield?source=legacy");
assert.equal(legacyHome.status, 308);
assert.equal(new URL(legacyHome.headers.location, target).href, new URL("/?source=legacy", preview ? target : canonical).href);

const legacy = await get(legacyPath);
assert.equal(legacy.status, 308);
const destination = new URL(legacy.headers.location, target);
assert.equal(destination.origin, preview ? target.origin : canonical);
assert.equal(destination.pathname + destination.search, canonicalPath);

if (preview) {
  for (const path of ["/api/farm/activity", "/api/cron/farm-summary", "/api/submit-lead"]) {
    const response = await get(path);
    assert.equal(response.status, 404, `Unrelated preview API is blocked for ${path}`);
    assert.match(String(response.headers["x-robots-tag"]), /noindex/i);
  }
} else {
  const www = await get(canonicalPath, "www.primefieldagric.com");
  assert.equal(www.status, 308);
  assert.equal(www.headers.location, canonical + canonicalPath);
  const otherOrigin = await get(legacyPath, "ultratidycleaning.com");
  assert.equal(otherOrigin.status, 308);
  assert.equal(otherOrigin.headers.location, canonical + canonicalPath);
  const otherRobots = await get("/robots.txt", "ultratidycleaning.com");
  assert.ok(otherRobots.body.includes("https://ultratidycleaning.com/sitemap.xml"), "UltraTidy robots preserved");
}

const missingRoutes = ["/missing-primefield-page", "/products/unlisted-product"];
if (preview) missingRoutes.push("/dashboard", "/farm-support", "/manager", "/property", "/content", "/register");
for (const path of missingRoutes) {
  const response = await get(path);
  assert.equal(response.status, 404, path);
  assert.match(response.body, /page not found/i, `Branded missing page for ${path}`);
}

console.log(`Primefield ${mode} routing passed: ${publicRoutes.length} pages, redirects, metadata, 404s and indexing rules.`);
