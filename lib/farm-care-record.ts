import { z } from "zod";
import { cashDate } from "./operations-cash-validation";

export const CARE_RECORD_COMPANY = "Primefield Agri-Business Limited";
export const CARE_RECORD_TITLE = "Animal Health and Farm Care Record";
export const CARE_RECORD_INSTRUCTIONS = "Use one row per animal or batch and activity. Copy a row when you need to record the same activity again.";
export const CARE_RECORD_REVIEW = "General Review and Suggestions";

export const CARE_RECORD_ACTIVITIES = [
  "Fowl pox booster",
  "Salt bath and partial water change",
  "Newcastle disease (LaSota) booster",
  "Deworming (ivermectin injection)",
  "Deworming (piperazine in drinking water)",
  "Hoof trimming",
  "Gumboro (IBD) vaccination, second dose",
  "Iron dextran and vitamin check",
  "PPR vaccination",
  "FMD vaccination",
  "Debeaking (beak trimming)",
  "Tick bath",
  "Dehorning",
  "Crossing (mating)",
  "Sorting and grading",
  "Layer-house fumigation",
  "Marek’s disease vaccination",
  "Ranikhet disease (Newcastle disease)",
  "Infectious bronchitis vaccination",
  "Fowl pox vaccination",
  "Infectious coryza",
  "Fowl cholera",
] as const;

export const CARE_RECORD_PAGE_SIZE = CARE_RECORD_ACTIVITIES.length;
export const CARE_RECORD_ACTIVITY_COLUMN = "Scheduled treatment or activity";

export const CARE_RECORD_FIELDS = [
  ["animal_group", "Animal group", "text"],
  ["location", "Location", "text"],
  ["animal_tag", "Animal ID / tag code", "text"],
  ["record_date", "Record date", "date"],
  ["age", "Age", "text"],
  ["breed", "Breed", "text"],
  ["markings", "Colour / special markings", "text"],
  ["diagnosis", "Issue / diagnosis", "textarea"],
  ["treatment", "Treatment / medication given", "textarea"],
  ["date_received", "Date received", "date"],
  ["duration", "Treatment duration", "text"],
  ["withdrawal", "Withdrawal period", "text"],
  ["next_due", "Next due date", "date"],
  ["animal_status", "Animal status (dead, alive or sold)", "select"],
  ["notes", "Notes / observations", "textarea"],
] as const;

export const CARE_RECORD_STATUS = ["dead", "alive", "sold"] as const;
export const CARE_RECORD_TEXT_LIMIT = 200;
export const CARE_RECORD_NOTE_LIMIT = 4000;

const short = z.string().trim().min(1).max(CARE_RECORD_TEXT_LIMIT);
const notes = z.string().trim().min(1).max(CARE_RECORD_NOTE_LIMIT);
const page = z.number().int().positive().max(2_147_483_647);
const revision = z.number().int().nonnegative().max(2_147_483_647);
const rowNumber = z.number().int().min(1).max(CARE_RECORD_PAGE_SIZE);
const values = z.strictObject({
  animal_group: short,
  location: short,
  animal_tag: short,
  record_date: cashDate,
  age: short,
  breed: short,
  markings: short,
  diagnosis: notes,
  treatment: notes,
  date_received: cashDate,
  duration: short,
  withdrawal: short,
  next_due: cashDate,
  animal_status: z.enum(CARE_RECORD_STATUS),
  notes,
}).partial();

export type CareRecordValues = z.infer<typeof values>;

export const careRecordPageSchema = z.object({
  register_id: z.string().uuid().nullable(),
  can_write: z.boolean(),
  page,
  page_count: page,
  registers: z.array(z.object({
    id: z.string().uuid(),
    manager_name: z.string(),
    starts_on: cashDate.nullable(),
    ends_on: cashDate.nullable(),
  })),
  rows: z.array(z.object({ row_number: rowNumber, activity: short, values, revision })),
  review: z.object({ text: notes, revision }).nullable(),
});

export const careRecordQuerySchema = z.strictObject({
  register_id: z.string().uuid().optional(),
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(page),
});

const request = { request_id: z.string().uuid(), register_id: z.string().uuid() };
export const careRecordWriteSchema = z.discriminatedUnion("operation", [
  z.strictObject({ ...request, operation: z.literal("add_page"), payload: z.strictObject({}) }),
  z.strictObject({ ...request, operation: z.literal("save_row"), payload: z.strictObject({
    page,
    row_number: rowNumber.nullable(),
    activity: short,
    values: values.refine((entry) => Object.keys(entry).length > 0),
    expected_revision: revision,
  }) }),
  z.strictObject({ ...request, operation: z.literal("save_review"), payload: z.strictObject({
    page,
    text: notes,
    expected_revision: revision,
  }) }),
]);

export const careRecordReceiptSchema = z.object({
  page,
  row_number: rowNumber.optional(),
  revision: revision.optional(),
});

export type CareRecordPage = z.infer<typeof careRecordPageSchema>;
export type CareRecordRow = CareRecordPage["rows"][number];
export type CareRecordWrite = z.infer<typeof careRecordWriteSchema>;
