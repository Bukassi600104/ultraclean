export const FARM_PRODUCT_KEYS = ["catfish", "goat", "chicken", "pig", "turkey", "cattle", "other", "crops"] as const;
export type FarmProduct = typeof FARM_PRODUCT_KEYS[number];
export type FarmPricingBasis = "per_kg" | "per_head" | "per_unit";

export const FARM_PRODUCTS: { key: FarmProduct; label: string; color: string; bg: string; pricingBasis: FarmPricingBasis }[] = [
  { key: "catfish", label: "Catfish", color: "#3b82f6", bg: "#eff6ff", pricingBasis: "per_kg" },
  { key: "goat", label: "Goat", color: "#f59e0b", bg: "#fffbeb", pricingBasis: "per_head" },
  { key: "chicken", label: "Chicken", color: "#f97316", bg: "#fff7ed", pricingBasis: "per_head" },
  { key: "pig", label: "Pig", color: "#ec4899", bg: "#fdf2f8", pricingBasis: "per_head" },
  { key: "turkey", label: "Turkey", color: "#7c3aed", bg: "#f5f3ff", pricingBasis: "per_head" },
  { key: "cattle", label: "Cattle", color: "#92400e", bg: "#fffbeb", pricingBasis: "per_head" },
  { key: "other", label: "Other", color: "#6b7280", bg: "#f3f4f6", pricingBasis: "per_unit" },
  { key: "crops", label: "Crops", color: "#10b981", bg: "#f0fdf4", pricingBasis: "per_unit" },
];
export const LIVESTOCK_PRODUCTS = FARM_PRODUCTS.filter((product) => product.key !== "other" && product.key !== "crops");
export function farmProductLabel(product: string) {
  return FARM_PRODUCTS.find((item) => item.key === product)?.label ?? product.replace(/_/g, " ");
}
export function farmDateToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
