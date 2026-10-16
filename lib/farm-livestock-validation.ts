import { z } from "zod";
export const classificationFields = {
  classification: z.object({chicken_type:z.string().max(30),growth_stage:z.string().max(40),sex:z.enum(["male","female","unknown"])}).strict().optional(),
  stock_group_id: z.string().uuid().nullable().optional(),
};
