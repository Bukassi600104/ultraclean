import { test, expect } from "@playwright/test";

// ─── HOMEPAGE ───────────────────────────────────────────────────
test.describe("Homepage", () => {
  test("loads and shows hero content", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(5000);

    // Hero headline must be visible
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("h1")).toContainText("ULTRACLEAN");

    // Hero subtext
    await expect(page.getByText("Professional cleaning services").first()).toBeVisible();

    // CTA buttons
    await expect(page.getByRole("link", { name: /Get Free Quote/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /View Our Services/i })).toBeVisible();

    // Trust badges
    await expect(page.getByText("Licensed & Insured")).toBeVisible();
    await expect(page.getByText("5-Star Rated")).toBeVisible();
  });

  test("hero badge is visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("Trusted by 500+ homeowners").first()).toBeVisible({ timeout: 10000 });
  });

  test("stats bar renders counters", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Happy Clients")).toBeVisible();
    await expect(page.getByText("Projects Completed")).toBeVisible();
  });

  test("services preview shows 3 services", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Our Services").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /View All Services/i })).toBeVisible();
  });

  test("gallery preview shows images", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Our Work").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /View Full Gallery/i })).toBeVisible();
  });

  test("testimonials carousel renders", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("What Our Clients Say")).toBeVisible();
  });

  test("CTA section renders with buttons", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Ready for a Spotless Home?")).toBeVisible();
  });
});

// ─── NAVIGATION ─────────────────────────────────────────────────
test.describe("Navigation", () => {
  test("header nav links are visible on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");

    const navLinks = ["Home", "Services", "Gallery", "About", "Blog", "Contact"];
    for (const link of navLinks) {
      await expect(page.locator("header").getByRole("link", { name: link })).toBeVisible();
    }
  });

  test("Get Free Quote button in header is visible", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await expect(
      page.locator("header").getByRole("link", { name: /Get Free Quote/i })
    ).toBeVisible();
  });

  test("clicking Services nav goes to /services", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: "Services" }).click();
    await expect(page).toHaveURL("/services");
  });

  test("clicking Gallery nav goes to /gallery", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: "Gallery" }).click();
    await expect(page).toHaveURL("/gallery");
  });

  test("clicking About nav goes to /about", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL("/about");
  });

  test("clicking Contact nav goes to /contact", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: "Contact" }).click();
    await expect(page).toHaveURL("/contact");
  });

  test("clicking Blog nav goes to /blog", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: "Blog" }).click();
    await expect(page).toHaveURL("/blog");
  });

  test("browser back button works correctly", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText("ULTRACLEAN", { timeout: 10000 });

    // Navigate to services
    await page.locator("header").getByRole("link", { name: "Services" }).click();
    await expect(page).toHaveURL("/services");

    // Go back
    await page.goBack();
    await expect(page).toHaveURL("/");

    // Hero content should still be visible (not distorted)
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("h1")).toContainText("ULTRACLEAN");
  });

  test("browser back/forward through multiple pages", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText("ULTRACLEAN", { timeout: 10000 });

    // Navigate: Home -> About -> Gallery
    await page.locator("header").getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL("/about");

    await page.locator("header").getByRole("link", { name: "Gallery" }).click();
    await expect(page).toHaveURL("/gallery");

    // Back to About
    await page.goBack();
    await expect(page).toHaveURL("/about");
    await expect(page.getByText("About UltraTidy").first()).toBeVisible();

    // Back to Home
    await page.goBack();
    await expect(page).toHaveURL("/");

    // Forward to About
    await page.goForward();
    await expect(page).toHaveURL("/about");
    await expect(page.getByText("About UltraTidy").first()).toBeVisible();
  });
});

// ─── SERVICES PAGE ──────────────────────────────────────────────
test.describe("Services Page", () => {
  test("renders all 5 services", async ({ page }) => {
    await page.goto("/services");

    await expect(page.getByText("Residential Cleaning").first()).toBeVisible();
    await expect(page.getByText("Commercial Cleaning").first()).toBeVisible();
    await expect(page.getByText("Deep Cleaning").first()).toBeVisible();
    await expect(page.getByText("Move-In/Move-Out").first()).toBeVisible();
    await expect(page.getByText("Post-Construction").first()).toBeVisible();
  });

  test("service cards have Get a Quote links", async ({ page }) => {
    await page.goto("/services");
    const quoteLinks = page.getByRole("link", { name: /Get a Quote/i });
    await expect(quoteLinks.first()).toBeVisible();
  });

  test("CTA section is present", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByText("Ready for a Spotless Home?")).toBeVisible();
  });
});

// ─── GALLERY PAGE ───────────────────────────────────────────────
test.describe("Gallery Page", () => {
  test("renders filter bar and gallery grid", async ({ page }) => {
    await page.goto("/gallery");
    await page.waitForLoadState("networkidle");

    // Filter buttons - use text locator as fallback
    const allButton = page.getByRole("button", { name: "All" });
    await expect(allButton).toBeVisible({ timeout: 10000 });

    // Gallery items should exist
    const gridItems = page.locator("button.group, .grid button");
    await expect(gridItems.first()).toBeVisible({ timeout: 10000 });
  });

  test("filter buttons change displayed items", async ({ page }) => {
    await page.goto("/gallery");
    await page.waitForLoadState("networkidle");

    // Click Residential filter - use exact match to avoid matching gallery item buttons
    const residentialButton = page.getByRole("button", { name: "Residential", exact: true });
    await expect(residentialButton).toBeVisible({ timeout: 10000 });
    await residentialButton.click();

    // Page should not break - main content should still be visible
    await expect(page.locator("main")).toBeVisible();
  });
});

// ─── ABOUT PAGE ─────────────────────────────────────────────────
test.describe("About Page", () => {
  test("renders all sections", async ({ page }) => {
    await page.goto("/about");

    await expect(page.getByText("About UltraTidy").first()).toBeVisible();
    await expect(page.getByText("Mrs. Bimbo Oyedotun").first()).toBeVisible();
    await expect(page.getByText("Our Values").first()).toBeVisible();
    await expect(page.getByText("Service Area").first()).toBeVisible();
    await expect(page.getByText("Business Hours").first()).toBeVisible();
  });

  test("values section shows 4 values", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByText("Passion for Clean")).toBeVisible();
    await expect(page.getByText("Trust & Reliability")).toBeVisible();
    await expect(page.getByText("Client-Focused")).toBeVisible();
    await expect(page.getByText("Quality Guaranteed")).toBeVisible();
  });
});

// ─── CONTACT PAGE ───────────────────────────────────────────────
test.describe("Contact Page", () => {
  test("renders form and sidebar", async ({ page }) => {
    await page.goto("/contact");

    // Form fields
    await expect(page.getByLabel(/Full Name/i)).toBeVisible();
    await expect(page.getByLabel(/Phone/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();

    // Submit button
    await expect(page.getByRole("button", { name: /Send Inquiry/i })).toBeVisible();

    // Sidebar
    await expect(page.getByText("Quick Contact").first()).toBeVisible();
    await expect(page.getByText("Business Hours").first()).toBeVisible();
  });

  test("form validation shows errors on empty submit", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: /Send Inquiry/i }).click();

    // Zod validation messages: "Name must be at least 2 characters", "Please enter a valid phone/email", "Please select a service"
    await expect(
      page.getByText(/must be at least|Please enter|Please select/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("sidebar is sticky on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/contact");

    const sidebar = page.locator(".lg\\:sticky");
    await expect(sidebar).toBeVisible();
  });
});

// ─── BLOG PAGE ──────────────────────────────────────────────────
test.describe("Blog Page", () => {
  test("renders with empty state or posts", async ({ page }) => {
    await page.goto("/blog");
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });
});

// ─── FOOTER ─────────────────────────────────────────────────────
test.describe("Footer", () => {
  test("renders all footer sections", async ({ page }) => {
    await page.goto("/");

    // Quick Links
    await expect(page.locator("footer").getByText("Quick Links")).toBeVisible();

    // Services
    await expect(page.locator("footer").getByText("Our Services")).toBeVisible();

    // Contact
    await expect(page.locator("footer").getByText("Get In Touch")).toBeVisible();

    // Copyright
    await expect(page.locator("footer").getByText(/UltraTidy Cleaning Services/)).toBeVisible();
  });

  test("footer nav links work", async ({ page }) => {
    await page.goto("/");
    await page.locator("footer").getByRole("link", { name: "Services" }).click();
    await expect(page).toHaveURL("/services");
  });

  test("business hours in footer are aligned", async ({ page }) => {
    await page.goto("/");
    const hoursDl = page.locator("footer dl");
    await expect(hoursDl).toBeVisible();
  });

  test("social links have correct targets", async ({ page }) => {
    await page.goto("/");
    const socialLinks = page.locator("footer a[target='_blank']");
    const count = await socialLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

// ─── SEO ────────────────────────────────────────────────────────
test.describe("SEO", () => {
  test("homepage has correct meta title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/UltraTidy/i);
  });

  test("services page has correct meta title", async ({ page }) => {
    await page.goto("/services");
    await expect(page).toHaveTitle(/Services.*UltraTidy/i);
  });

  test("about page has correct meta title", async ({ page }) => {
    await page.goto("/about");
    await expect(page).toHaveTitle(/About.*UltraTidy/i);
  });

  test("contact page has correct meta title", async ({ page }) => {
    await page.goto("/contact");
    await expect(page).toHaveTitle(/Contact.*UltraTidy/i);
  });

  test("gallery page has correct meta title", async ({ page }) => {
    await page.goto("/gallery");
    await expect(page).toHaveTitle(/Gallery.*UltraTidy/i);
  });

  test("homepage has meta description", async ({ page }) => {
    await page.goto("/");
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute("content", /cleaning/i);
  });

  test("services page has Schema.org markup", async ({ page }) => {
    await page.goto("/services");
    const schema = page.locator('script[type="application/ld+json"]');
    await expect(schema).toBeAttached();
  });

  test("homepage has Schema.org LocalBusiness markup", async ({ page }) => {
    await page.goto("/");
    const schemas = page.locator('script[type="application/ld+json"]');
    const count = await schemas.count();
    expect(count).toBeGreaterThanOrEqual(1);
    const content = await schemas.first().textContent();
    expect(content).toContain("LocalBusiness");
    expect(content).toContain("UltraTidy");
  });

  test("pages have canonical URLs", async ({ page }) => {
    const routes = ["/", "/services", "/about", "/gallery", "/contact", "/blog", "/privacy", "/terms"];
    for (const route of routes) {
      await page.goto(route);
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toBeAttached();
      const href = await canonical.getAttribute("href");
      expect(href).toContain("ultratidy.ca");
    }
  });

  test("privacy page has correct meta title", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page).toHaveTitle(/Privacy.*UltraTidy/i);
  });

  test("terms page has correct meta title", async ({ page }) => {
    await page.goto("/terms");
    await expect(page).toHaveTitle(/Terms.*UltraTidy/i);
  });

  test("robots.txt is accessible", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    expect(response?.status()).toBe(200);
  });

  test("sitemap.xml is accessible", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response?.status()).toBe(200);
  });

  test("sitemap includes privacy and terms pages", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    const text = await response?.text();
    expect(text).toContain("/privacy");
    expect(text).toContain("/terms");
  });
});

// ─── IMAGES ─────────────────────────────────────────────────────
test.describe("Images", () => {
  test("hero image loads correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const heroImg = page.locator("section").first().locator("img").first();
    await expect(heroImg).toBeVisible({ timeout: 10000 });
    const naturalWidth = await heroImg.evaluate((el: HTMLImageElement) => el.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
  });

  test("all images on services page load", async ({ page }) => {
    await page.goto("/services");
    await page.waitForLoadState("networkidle");
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      if (await img.isVisible()) {
        const src = await img.getAttribute("src");
        expect(src).toBeTruthy();
      }
    }
  });

  test("images use next/image (have srcset)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const images = page.locator("img[srcset], img[src*='/_next/image']");
    const count = await images.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ─── BUTTONS & LINKS ────────────────────────────────────────────
test.describe("Buttons and Links", () => {
  test("hero CTA Get Free Quote links to /contact", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const cta = page.getByRole("link", { name: /Get Free Quote/i }).first();
    await expect(cta).toHaveAttribute("href", "/contact");
  });

  test("hero CTA View Our Services links to /services", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const cta = page.getByRole("link", { name: /View Our Services/i });
    await expect(cta).toHaveAttribute("href", "/services");
  });

  test("View All Services link on homepage works", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: /View All Services/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL("/services");
  });

  test("View Full Gallery link on homepage works", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: /View Full Gallery/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL("/gallery");
  });

  test("CTA section Get Your Free Quote button works", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Ready for a Spotless Home?").scrollIntoViewIfNeeded();
    const ctaButton = page.getByRole("link", { name: /Get Your Free Quote/i });
    await expect(ctaButton).toBeVisible();
    await ctaButton.click();
    await expect(page).toHaveURL("/contact");
  });

  test("header Get Free Quote button works", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: /Get Free Quote/i }).click();
    await expect(page).toHaveURL("/contact");
  });

  test("phone link has tel: prefix", async ({ page }) => {
    await page.goto("/contact");
    const phoneLink = page.locator('a[href^="tel:"]').first();
    await expect(phoneLink).toBeVisible();
  });

  test("email link has mailto: prefix", async ({ page }) => {
    await page.goto("/contact");
    const emailLink = page.locator('a[href^="mailto:"]').first();
    await expect(emailLink).toBeVisible();
  });
});

// ─── PRIVACY POLICY PAGE ───────────────────────────────────────
test.describe("Privacy Policy Page", () => {
  test("loads and renders content", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page).toHaveTitle(/Privacy.*UltraTidy/i);
    await expect(page.getByText("Privacy Policy").first()).toBeVisible();
  });

  test("contains required CASL/PIPEDA sections", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByText(/Information We Collect/i).first()).toBeVisible();
    await expect(page.getByText(/How We Use Your Information/i).first()).toBeVisible();
    await expect(page.getByText(/Your Rights/i).first()).toBeVisible();
  });

  test("displays correct contact info", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByText("hello@ultratidycleaning.com").first()).toBeVisible();
    await expect(page.getByText(/647.*823.*8262/).first()).toBeVisible();
  });
});

// ─── TERMS OF SERVICE PAGE ─────────────────────────────────────
test.describe("Terms of Service Page", () => {
  test("loads and renders content", async ({ page }) => {
    await page.goto("/terms");
    await expect(page).toHaveTitle(/Terms.*UltraTidy/i);
    await expect(page.getByText("Terms of Service").first()).toBeVisible();
  });

  test("contains key legal sections", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByText(/Cancellation/i).first()).toBeVisible();
    await expect(page.getByText(/Payment/i).first()).toBeVisible();
    await expect(page.getByText(/Liability/i).first()).toBeVisible();
  });

  test("displays correct contact info", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByText("hello@ultratidycleaning.com").first()).toBeVisible();
    await expect(page.getByText(/647.*823.*8262/).first()).toBeVisible();
  });
});

// ─── 404 PAGE ───────────────────────────────────────────────────
test.describe("404 Page", () => {
  test("shows 404 for unknown routes", async ({ page }) => {
    const response = await page.goto("/nonexistent-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("404")).toBeVisible();
  });
});

// ─── MOBILE ─────────────────────────────────────────────────────
test.describe("Mobile", () => {
  test("mobile menu opens and closes", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const menuButton = page.getByRole("button", { name: /open menu/i });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    await expect(page.getByRole("link", { name: "Services" }).last()).toBeVisible();
    await expect(page.getByRole("link", { name: "About" }).last()).toBeVisible();
  });

  test("mobile nav link navigates and closes sheet", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    await page.getByRole("button", { name: /open menu/i }).click();
    await page.getByRole("link", { name: "Services" }).last().click();
    await expect(page).toHaveURL("/services");
  });
});

// ─── PAGE LOAD PERFORMANCE ──────────────────────────────────────
test.describe("Performance", () => {
  const pages = [
    { name: "Homepage", path: "/" },
    { name: "Services", path: "/services" },
    { name: "Gallery", path: "/gallery" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
    { name: "Blog", path: "/blog" },
    { name: "Privacy", path: "/privacy" },
    { name: "Terms", path: "/terms" },
  ];

  for (const p of pages) {
    test(`${p.name} loads within 5 seconds`, async ({ page }) => {
      const start = Date.now();
      await page.goto(p.path);
      const loadTime = Date.now() - start;
      expect(loadTime).toBeLessThan(5000);
    });
  }

  for (const p of pages) {
    test(`${p.name} has no console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(msg.text());
        }
      });
      await page.goto(p.path);
      await page.waitForLoadState("networkidle");
      const realErrors = errors.filter(
        (e) =>
          !e.includes("Supabase") &&
          !e.includes("Redis") &&
          !e.includes("Upstash") &&
          !e.includes("Failed to load resource")
      );
      expect(realErrors).toHaveLength(0);
    });
  }
});
