export const PRIMEFIELD_CANONICAL_HOST = "primefieldagric.com";
export const PRIMEFIELD_ORIGIN = `https://${PRIMEFIELD_CANONICAL_HOST}`;

export const PRIMEFIELD_PRODUCT_SLUGS = [
  "catfish",
  "goats",
  "broiler-chickens",
  "seasonal-produce",
] as const;

export const PRIMEFIELD_PUBLIC_PATHS = [
  "/",
  "/products",
  ...PRIMEFIELD_PRODUCT_SLUGS.map((slug) => `/products/${slug}` as const),
  "/about",
  "/contact",
  "/privacy",
  "/terms",
] as const;

export function primefieldCanonical(path: string): string {
  return new URL(path, PRIMEFIELD_ORIGIN).toString();
}

export function isPrimefieldRedesignPreview(): boolean {
  return process.env.VERCEL_ENV === "preview"
    && (process.env.VERCEL_GIT_COMMIT_REF === "codex/primefield-public-redesign"
      || process.env.PRIMEFIELD_REDESIGN_PREVIEW === "1");
}
