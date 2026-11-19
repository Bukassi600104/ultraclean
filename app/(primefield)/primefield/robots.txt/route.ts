import { isPrimefieldRedesignPreview, primefieldCanonical } from "@/lib/primefield-routing";

export const dynamic = "force-dynamic";

export function GET() {
  const rules = ["User-agent: *", "Allow: /", "Disallow: /api/"];

  // Crawlers need to see the preview's noindex response header.
  if (!isPrimefieldRedesignPreview()) {
    rules.push(`Sitemap: ${primefieldCanonical("/sitemap.xml")}`);
  }

  return new Response(`${rules.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
