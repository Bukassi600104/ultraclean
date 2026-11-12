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
export const EGG_SALE_PRODUCT = {key: "eggs", label: "Eggs", color: "#855f24", bg: "#faf5e7", pricingBasis: "per_unit"} as const;
export function isRecordedEggSale(sale: {product?: unknown; egg_batch_id?: unknown; other_product_name?: unknown}) {
  return typeof sale.egg_batch_id === "string" && sale.egg_batch_id.length > 0 || sale.product === "other" && typeof sale.other_product_name === "string" && /^eggs?$/i.test(sale.other_product_name.trim());
}
export function saleProductLabel(sale: {product: string; egg_batch_id?: string | null; other_product_name?: string | null}) {
  if (isRecordedEggSale(sale)) return "Eggs";
  return (sale.product === "other" || sale.product === "crops") && sale.other_product_name?.trim() ? sale.other_product_name.trim() : farmProductLabel(sale.product);
}
export const LIVESTOCK_PRODUCTS = FARM_PRODUCTS.filter((product) => product.key !== "other" && product.key !== "crops");
export function farmProductLabel(product: string) {
  return FARM_PRODUCTS.find((item) => item.key === product)?.label ?? product.replace(/_/g, " ");
}
export function farmDateToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function farmTimestamp(value: string | null | undefined) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {timeZone:"Africa/Lagos", dateStyle:"medium", timeStyle:"short"}).format(new Date(value)) + " (Nigeria time)";
}
