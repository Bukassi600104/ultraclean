import { z } from "zod";

export const FARM_RECORD_TABLES = {
  sale: "farm_sales", expense: "farm_expenses", fund: "farm_fund_transfers",
  inventory: "farm_inventory", inventory_transaction: "farm_inventory_transactions",
  supply: "farm_supply_inventory", supply_transaction: "farm_supply_transactions",
  feed: "farm_feed_purchases", daily_feed: "farm_daily_feed",
} as const;
export type FarmRecordType = keyof typeof FARM_RECORD_TABLES;
export const farmRecordTypeSchema = z.enum(Object.keys(FARM_RECORD_TABLES) as [FarmRecordType, ...FarmRecordType[]]);
const text = z.string().max(1000).nullable().optional();
const date = z.iso.date().optional();
const positive = z.number().finite().positive().optional();
const revision = z.number().int().nonnegative();
const schemas: Record<FarmRecordType, z.ZodType> = {
  sale: z.object({ expected_revision: revision, date, customer_name: text,
    product: z.enum(["catfish","goat","chicken","pig","turkey","cattle","other","crops"]).optional(),
    quantity: positive, unit_price: positive, weight_kg: positive.nullable(),
    pricing_basis: z.enum(["per_kg","per_head","per_unit"]).optional(),
    gender: z.enum(["male","female"]).nullable().optional(), other_product_name: text,
    total_amount: z.number().finite().nonnegative().optional(), payment_method: z.enum(["cash","transfer","pos"]).optional(), notes: text }),
  expense: z.object({ expected_revision: revision, date, category: z.enum(["feed","labor","utilities","veterinary","transport","equipment","produce"]).optional(), amount: positive, paid_to: text, item_name: text, payment_method: z.enum(["cash","transfer","pos"]).optional(), expense_source: z.enum(["bimbo_transfer","sales_cash"]).optional(), notes: text }),
  fund: z.object({ expected_revision: revision, date, amount: positive, notes: text }),
  inventory: z.object({ target_quantity: z.number().finite().nonnegative(), expected_current_stock: z.number().finite(), date }),
  inventory_transaction: z.object({ product: z.string().min(1).max(100).optional(), quantity: positive, notes: text, date }),
  supply: z.object({ expected_revision: revision, item_name: z.string().trim().min(1).max(200).optional(), category: z.string().max(100).optional(), unit: z.string().min(1).max(50).optional(), restock_threshold: z.number().finite().nonnegative().nullable().optional(), notes: text, quantity_change: z.number().finite().optional(), date }),
  supply_transaction: z.object({ quantity_change: z.number().finite(), date }),
  feed: z.object({ expected_revision: revision, date, feed_type: z.enum(["fish","goat","chicken","pig","turkey","cattle","other"]).optional(), feed_source: z.enum(["local","foreign"]).optional(), weight_unit: z.enum(["tons","kg"]).optional(), weight_amount: positive, num_bags: z.number().int().positive().optional(), cost: positive, notes: text }),
  daily_feed: z.object({ expected_revision: revision, date, feed_type: z.enum(["fish","goat","chicken","pig","turkey","cattle","other"]).optional(), feed_source: z.enum(["local","foreign"]).optional(), num_bags: z.number().int().positive().optional(), notes: text }),
};
export function parseFarmCorrection(kind: FarmRecordType, changes: unknown) { return schemas[kind].safeParse(changes); }
