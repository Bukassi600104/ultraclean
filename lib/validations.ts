import { z } from "zod";

// ── Public contact form ──
export const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .regex(/^[\d\s()+\-]+$/, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email address"),
  service: z.string().min(1, "Please select a service"),
  propertyType: z.string().optional(),
  squareFootage: z.string().optional(),
  dateNeeded: z.string().optional(),
  timePreference: z.string().optional(),
  frequency: z.string().optional(),
  specialRequests: z.string().optional(),
  referralSource: z.string().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

// ── Login ──
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// ── Leads (admin CRM) ──
export const leadCreateSchema = z.object({
  business: z.enum(["ultratidy", "dba", "primefield"]),
  source: z.string().optional(),
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(7, "Phone is required"),
  service: z.string().min(1, "Service is required"),
  property_size: z.string().optional(),
  date_needed: z.string().optional(),
  notes: z.string().optional(),
  status: z
    .enum(["new", "contacted", "quoted", "booked", "completed", "lost"])
    .optional(),
});

export const leadUpdateSchema = z.object({
  status: z
    .enum(["new", "contacted", "quoted", "booked", "completed", "lost"])
    .optional(),
  notes: z.string().optional(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  service: z.string().optional(),
  property_size: z.string().nullable().optional(),
  date_needed: z.string().nullable().optional(),
});

// ── Blog ──
export const blogPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),
  content: z.string().optional(),
  excerpt: z.string().optional(),
  featured_image: z.string().nullable().optional(),
  meta_description: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

// ── DBA Products ──
export const dbaProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: z.preprocess((v) => Number(v), z.number().min(0, "Price must be positive")),
  file_url: z.string().optional(),
  thumbnail: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const dbaSaleSchema = z.object({
  product_id: z.string().min(1, "Select a product"),
  buyer_name: z.string().min(1, "Buyer name is required"),
  buyer_email: z.string().email("Valid email required"),
  amount: z.preprocess((v) => Number(v), z.number().min(0)),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
});

// ── Farm ──
export const farmSaleSchema = z.object({
  date: z.string(),
  customer_name: z.string().min(1, "Customer name is required"),
  product: z.enum(["catfish", "goat", "chicken", "other"]),
  quantity: z.preprocess((v) => Number(v), z.number().positive("Quantity must be positive")),
  unit_price: z.preprocess((v) => Number(v), z.number().positive("Unit price must be positive")),
  payment_method: z.string(),
  notes: z.string().optional(),
});

export const farmExpenseSchema = z.object({
  date: z.string(),
  category: z.enum([
    "feed",
    "labor",
    "utilities",
    "veterinary",
    "transport",
    "equipment",
  ]),
  amount: z.preprocess((v) => Number(v), z.number().positive("Amount must be positive")),
  paid_to: z.string().optional(),
  payment_method: z.string(),
  notes: z.string().optional(),
});

export const farmInventoryTransactionSchema = z.object({
  product: z.string().min(1, "Product is required"),
  action: z.enum(["add", "remove", "sale", "mortality"]),
  quantity: z.preprocess((v) => Number(v), z.number().positive("Quantity must be positive")),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

// ── Change Password (admin self-service) ──
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

// ── Manager user management ──
export const managerCreateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

export const managerUpdateSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .optional(),
  name: z.string().min(2).optional(),
});

export const managerResetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});
