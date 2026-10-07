import { z } from "zod";

const text = z.string().trim().min(1).max(3000);
const optionalText = z.string().max(3000).nullable().optional();
const id = z.string().uuid();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Enter a real calendar date");
const currency = z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code, e.g. CAD");
const amount = z.number().finite().positive().max(99999999999999.99);
const base = {
  properties: z.object({name: text.max(200), address: text.max(1000), status: z.enum(["active", "inactive"]), currency}),
  units: z.object({property_id: id, name: text.max(200), status: z.enum(["vacant", "occupied", "unavailable"])}),
  tenancies: z.object({unit_id: id, tenant_name: text.max(200), tenant_contact: z.string().max(500).nullable().optional(), start_date: day, end_date: day.nullable().optional(), rent_amount: z.number().finite().nonnegative().max(99999999999999.99), currency, status: z.enum(["active", "ended"])}),
  rent: z.object({tenancy_id: id, amount, currency, payment_date: day, period_start: day, period_end: day, payment_method: text.max(100), notes: optionalText}),
  expenses: z.object({property_id: id, unit_id: id.nullable().optional(), category: text.max(100), amount, currency, expense_date: day, notes: optionalText}),
  maintenance: z.object({property_id: id, unit_id: id.nullable().optional(), issue: text, category: z.enum(["maintenance", "repair"]), status: z.enum(["open", "in_progress", "resolved"]), priority: z.enum(["low", "normal", "high", "urgent"]), cost: z.number().finite().nonnegative().max(99999999999999.99).nullable().optional(), currency, resolution: optionalText}),
};
export const propertyKinds = {
  properties: {kind: "property", table: "property_properties", label: "Properties"},
  units: {kind: "unit", table: "property_units", label: "Units & vacancies"},
  tenancies: {kind: "tenancy", table: "property_tenancies", label: "Tenancies"},
  rent: {kind: "rent_payment", table: "property_rent_payments", label: "Rent payments"},
  expenses: {kind: "expense", table: "property_expenses", label: "Expenses"},
  maintenance: {kind: "maintenance", table: "property_maintenance", label: "Maintenance & repairs"},
} as const;
export type PropertySection = keyof typeof propertyKinds;
export type PropertyRow = {id: string; revision: number; created_at: string; updated_at: string; created_by: string; [key: string]: string | number | null};
export function isPropertySection(value: string): value is PropertySection {return Object.prototype.hasOwnProperty.call(propertyKinds, value);}
export function parsePropertyWrite(section: PropertySection, body: unknown) {
  const envelope = z.object({operation: z.enum(["create", "update"]).default("create"), id: id.optional(), reason: z.string().trim().min(1).max(2000).optional(), request_id: id.optional(), expected_revision: z.number().int().nonnegative().optional()}).passthrough().parse(body);
  const {operation, id: targetId, reason, request_id, expected_revision, ...fields} = envelope;
  if (operation === "update" && (!targetId || !reason || expected_revision === undefined)) throw new Error("A record, revision and correction reason are required");
  if (operation === "create" && (targetId || expected_revision !== undefined)) throw new Error("Creation cannot supply a saved record or revision");
  const payload = (operation === "create" ? base[section].strict() : base[section].partial().strict()).parse(fields);
  if (section === "units" && operation === "create" && "status" in payload && payload.status === "occupied") throw new Error("Create a tenancy to occupy a unit");
  if (!Object.keys(payload).length) throw new Error("Supply the fields to save");
  return {operation, targetId, reason, request_id, payload: {...payload, ...(operation === "update" ? {expected_revision} : {})}};
}

export function propertyMoney(value: number, code: string) {
  try {return new Intl.NumberFormat("en", {style: "currency", currency: code, currencyDisplay: "code"}).format(value);}
  catch {return `${code} ${value.toFixed(2)}`;}
}
