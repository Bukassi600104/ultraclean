// Record keys remain unchanged in requests; these helpers are only for visible history.
const uuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const labels: Record<string, string> = {
  item_name: "Item", current_quantity: "Quantity available", quantity_change: "Quantity change",
  current_stock: "Stock available", unit_price: "Unit price", total_amount: "Total amount",
  weight_kg: "Weight (kg)", num_bags: "Number of bags", expense_source: "Paid from",
  pricing_basis: "Price measured by", per_kg: "Per kilogram", per_head: "Per animal", per_unit: "Per item",
  owner_fund: "Owner funds", owner_funds: "Owner funds", bimbo_transfer: "Owner funds", sales_cash: "Sales money",
  awaiting_handover: "Awaiting stock confirmation", pending_funding: "Awaiting funding confirmation",
  supply_transaction: "Supply change", inventory_transaction: "Stock change", daily_feed: "Daily feeding",
  created_at: "Recorded on", updated_at: "Last updated", happened_at: "Recorded on",
  voided_at: "Cancelled on", archived_at: "Archived on", before_value: "Before", after_value: "After",
  requested_change: "Requested correction", recorded_by: "Recorded by", restock_threshold: "Low stock alert level",
};

export function isInternalField(key: string): boolean {
  return key === "id" || /_ids?$/.test(key) || /Ids?$/.test(key) || /_by$/.test(key) ||
    ["revision", "version", "fingerprint", "request_key", "retry_key", "_source_json"].includes(key);
}

export function displayFieldName(key: string): string {
  return labels[key] || key.replace(/^(farm_|property_|content_|operations_|manager_)/, "").replaceAll("_", " ").replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function displayRecordValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not recorded";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map(displayRecordValue).join("; ") : "None";
  if (typeof value === "object") {
    const parts = Object.entries(value).filter(([key]) => !isInternalField(key))
      .map(([key, item]) => `${displayFieldName(key)}: ${displayRecordValue(item)}`);
    return parts.join("; ") || "Details not recorded";
  }
  const text = String(value);
  if (uuid.test(text) && text.trim().length === 36) return "Linked record (name unavailable)";
  return labels[text] || (/^[a-z]+(?:_[a-z0-9]+)+$/.test(text) ? displayFieldName(text) : text);
}

// Only use for system instructions. Names in original records and messages are attribution.
export function displayRoleMessage(message: string): string {
  return message.replace(/\bBimbo\b/g, (_, offset) => offset === 0 ? "The MD/Owner" : "the MD/Owner");
}

export function isTechnicalMessage(message: string): boolean {
  return uuid.test(message) || /invalid input syntax|violates .*constraint|null value in column|duplicate key value|permission denied for|row.level security|\b(SQLSTATE|PostgREST|PGRST\d+)|\b(function|relation|column|schema) ["']|syntax error/i.test(message);
}
