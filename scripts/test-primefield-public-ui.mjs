import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const origin = new URL(process.argv[2] ?? "http://localhost:4173");
const local = ["localhost", "127.0.0.1"].includes(origin.hostname);
assert.ok(local || origin.hostname.endsWith(".vercel.app"), "Use the isolated preview origin");

const pages = [
  ["/", "Fresh from our farm in Ibadan."], ["/products", "Farm products"],
  ["/products/catfish", "Catfish"], ["/products/goats", "Goats"],
  ["/products/broiler-chickens", "Broiler chickens"], ["/products/seasonal-produce", "Seasonal produce"],
  ["/about", "Our farm in Ibadan"], ["/contact", "Get in touch"],
  ["/privacy", "Privacy notice"], ["/terms", "Website terms"],
];
const allowed = new Set(pages.map(([route]) => route));
const browser = await chromium.launch({ headless: true });

try {
  const errors = [];
  for (const [width, height] of [[1440, 1000], [390, 844], [320, 740], [768, 1024]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
      await page.route(origin.origin + "/**", (route) => route.continue({
        headers: { ...route.request().headers(), "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET },
      }));
    }
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText;
      if (failure && failure !== "net::ERR_ABORTED") errors.push(request.url() + " " + failure);
    });
    const paths = width === 1440 || width === 390 ? pages : pages.filter(([route]) => ["/", "/products", "/contact", "/privacy"].includes(route));
    for (const [route, heading] of paths) {
      const response = await page.goto(new URL(route, origin).href);
      assert.equal(response.status(), 200);
      assert.match(await response.headerValue("x-robots-tag"), /noindex/i);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      const inspection = await page.evaluate(async () => {
        const images = [...document.images];
        await Promise.all(images.map(async (img) => {
          img.loading = "eager";
          await img.decode().catch(() => {});
        }));
        return {
          scrollWidth: document.documentElement.scrollWidth,
          viewport: window.innerWidth,
          missingImages: images.filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src),
          links: [...document.links].map((link) => ({ attribute: link.getAttribute("href"), href: link.href })),
        };
      });
      assert.ok(inspection.scrollWidth <= inspection.viewport + 1, route + " overflows at width " + width);
      assert.deepEqual(inspection.missingImages, [], route + " image missing at " + width);
      for (const link of inspection.links) {
        const url = new URL(link.href);
        if (url.origin === origin.origin) {
          assert.ok(allowed.has(url.pathname), "Unexpected internal target " + url);
          if (link.attribute?.startsWith("#")) assert.ok(await page.locator(link.attribute).count(), "Missing fragment " + link.href);
        } else if (url.protocol === "tel:") {
          assert.equal(url.href, "tel:+2348055306917");
        } else if (url.protocol === "mailto:") {
          assert.equal(url.href, "mailto:orders@primefieldagric.com");
        } else {
          assert.equal(url.hostname, "www.google.com");
          assert.ok(url.pathname.startsWith("/maps/"));
          assert.match(url.searchParams.get("query"), /Agbon Ile Village/);
        }
      }
      if (process.env.PRIMEFIELD_QA_SCREENSHOTS && [1440, 390].includes(width) && ["/", "/products", "/about", "/contact"].includes(route)) {
        await mkdir(process.env.PRIMEFIELD_QA_SCREENSHOTS, { recursive: true });
        await page.screenshot({
          path: path.join(process.env.PRIMEFIELD_QA_SCREENSHOTS, (route.slice(1) || "home") + "-" + width + ".png"),
          fullPage: true, animations: "disabled",
        });
      }
    }

    await page.goto(origin.href);
    const scenes = page.getByRole("group", { name: "Choose a farm scene" });
    const fields = scenes.getByRole("button", { name: "Fields" });
    const ponds = scenes.getByRole("button", { name: "Ponds" });
    await expect(fields).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".pf-scene-ponds")).toHaveCount(0);
    await ponds.click();
    await expect(ponds).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".pf-scene-ponds")).toHaveAttribute("data-visible", "true");
    await expect(page.getByRole("img", { name: /lifting a hand net/ })).toBeVisible();
    await fields.click();
    await expect(fields).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".pf-scene-ponds")).toHaveAttribute("data-visible", "false");

    const tabs = page.getByRole("tablist", { name: "Explore farm products" });
    const productPanel = page.getByRole("tabpanel");
    await expect(tabs.getByRole("tab", { name: "Catfish" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("link", { name: "Explore products" }).click();
    assert.equal(new URL(page.url()).hash, "#products");
    await tabs.getByRole("tab", { name: "Goats" }).click();
    await expect(productPanel.getByRole("heading", { name: "Goats" })).toBeVisible();
    await expect(productPanel.getByRole("link", { name: "Request a quote" })).toHaveAttribute("href", "/contact?request=quote&product=goats");
    await page.keyboard.press("ArrowRight");
    const broilerTab = tabs.getByRole("tab", { name: "Broiler chickens" });
    await expect(broilerTab).toBeFocused();
    await expect(broilerTab).toHaveAttribute("aria-selected", "true");
    await expect(productPanel.getByRole("heading", { name: "Broiler chickens" })).toBeVisible();
    await page.keyboard.press("End");
    await expect(productPanel.getByRole("heading", { name: "Seasonal produce" })).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await page.locator(".pf-scene-fields").evaluate((node) => getComputedStyle(node).animationName), "none");
    assert.equal(await page.locator(".pf-scene-ponds").evaluate((node) => getComputedStyle(node).transitionDuration), "0s");
    assert.equal(await page.locator(".pf-explorer-content").evaluate((node) => getComputedStyle(node).animationName), "none");
    await page.emulateMedia({ reducedMotion: null });

    await page.goto(origin.href);
    if (width <= 720) {
      const menu = page.getByRole("button", { name: "Menu" });
      await menu.click();
      const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
      await expect(navigation).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(navigation).toBeHidden();
      await expect(menu).toBeFocused();
      await menu.click();
      await navigation.getByRole("link", { name: "Products" }).click();
      await expect(page.getByRole("heading", { name: "Farm products" })).toBeVisible();
      await expect(navigation).toBeHidden();
    } else {
      await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Products" }).click();
      await expect(page.getByRole("heading", { name: "Farm products" })).toBeVisible();
    }
    await page.getByRole("link", { name: "View catfish", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Catfish" })).toBeVisible();
    await page.locator("main").getByRole("link", { name: "Request a quote", exact: true }).click();
    await expect(page.getByLabel("Product", { exact: true })).toHaveValue("catfish");
    assert.equal(new URL(page.url()).searchParams.get("product"), "catfish");
    await expect(page.getByText("kg", { exact: true })).toBeVisible();

    if (width === 390 || width === 1440) {
      const requests = [];
      await page.route("**/api/submit-lead", async (route) => {
        requests.push(route.request().postDataJSON());
        if (!local && process.env.PRIMEFIELD_TEST_PREVIEW_POST !== "yes") {
          return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, preview: true }) });
        }
        return route.fallback();
      });
      await page.getByLabel("Quantity", { exact: true }).fill("5");
      await page.getByLabel("Full name").fill("Testing Fixture");
      await page.getByLabel("Email", { exact: true }).fill("test@example.test");
      await page.getByLabel("Phone", { exact: true }).fill("+234 800 000 0000");
      await page.getByRole("button", { name: "Send quote request" }).click();
      await expect(page.getByRole("heading", { name: "Preview enquiry checked" })).toBeVisible();
      assert.equal(requests.length, 1);
      assert.equal(requests[0].business, "primefield");
      assert.equal(requests[0].service, "buying");
      assert.match(requests[0].specialRequests, /Product: Catfish\nQuantity: 5 kg/);

      await page.goto(new URL("/#contact", origin).href);
      await expect(page.getByRole("form", { name: "General enquiry" })).toBeVisible();
      await page.getByLabel("Reason").selectOption("partnership");
      await page.getByLabel("Full name").fill("Fixture Only");
      await page.getByLabel("Email", { exact: true }).fill("fixture@example.test");
      await page.getByLabel("Phone", { exact: true }).fill("+234 800 000 0000");
      await page.getByLabel("Message", { exact: true }).fill("Partnership fixture");
      await page.getByRole("button", { name: "Send enquiry" }).click();
      await expect(page.getByRole("heading", { name: "Preview enquiry checked" })).toBeVisible();
      assert.equal(requests.length, 2);
      assert.equal(requests[1].service, "partnership");
      assert.equal(requests[1].specialRequests, "Partnership fixture");
    }

    await context.close();
    console.log("PASS routes, navigation, scene and product controls, reduced motion, and product enquiries at " + width + "px");
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
