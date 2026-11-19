import type { MetadataRoute } from "next";
import {
  isPrimefieldRedesignPreview,
  primefieldCanonical,
  PRIMEFIELD_PUBLIC_PATHS,
} from "@/lib/primefield-routing";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  if (isPrimefieldRedesignPreview()) return [];

  return PRIMEFIELD_PUBLIC_PATHS.map((path) => ({ url: primefieldCanonical(path) }));
}
