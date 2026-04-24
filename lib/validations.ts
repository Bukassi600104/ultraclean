import { z } from "zod";

// ── Public contact form ──
export const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .max(30)
    .regex(/^[\d\s()+\-]+$/, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email address").max(254),
  service: z.string().min(1, "Please select a service").max(100),
  propertyType: z.string().max(100).optional(),
  squareFootage: z.string().max(20).optional(),
  dateNeeded: z.string().max(30).optional(),
  timePreference: z.string().max(50).optional(),
  frequency: z.string().max(50).optional(),
  specialRequests: z.string().max(2000).optional(),
  referralSource: z.string().max(100).optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

// API-only: extends the form with business field (not in the frontend form)
export const submitLeadSchema = contactFormSchema.extend({
  business: z.enum(["ultratidy", "dba", "primefield"]).optional().default("ultratidy"),
});

// ── Login ──
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// ── Leads (admin CRM) ──
export const leadCreateSchema = z.object({
  business: z.enum(["ultratidy", "dba", "primefield"]),
  source: z.string().max(100).optional(),
  name: z.string().min(2, "Name is required").max(100),
  email: z.string().email("Valid email required").max(254),
  phone: z.string().min(7, "Phone is required").max(30),
  service: z.string().min(1, "Service is required").max(100),
  property_size: z.string().max(50).optional(),
  date_needed: z.string().max(30).optional(),
  notes: z.string().max(5000).optional(),
  status: z
    .enum(["new", "contacted", "quoted", "booked", "completed", "lost"])
    .optional(),
});

export const leadUpdateSchema = z.object({
  status: z
    .enum(["new", "contacted", "quoted", "booked", "completed", "lost"])
    .optional(),
  notes: z.string().max(5000).optional(),
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(254).optional(),
  phone: z.string().min(7).max(30).optional(),
  service: z.string().max(100).optional(),
  property_size: z.string().max(50).nullable().optional(),
  date_needed: z.string().max(30).nullable().optional(),
});

// ── Blog ──
export const blogPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),
  content: z.string().max(500000).optional(),
  excerpt: z.string().max(500).optional(),
  featured_image: z.string().max(500).nullable().optional(),
  meta_description: z.string().max(300).optional(),
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
  product: z.enum(["catfish", "goat", "chicken", "pig", "turkey", "other"]),
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
    "produce",
  ]),
  amount: z.preprocess((v) => Number(v), z.number().positive("Amount must be positive")),
  paid_to: z.string().optional(),
  payment_method: z.string(),
  notes: z.string().optional(),
});

export const farmInventoryTransactionSchema = z.object({
  product: z.string().min(1, "Product is required").max(100),
  action: z.enum(["add", "remove", "sale", "mortality"]),
  quantity: z.preprocess((v) => Number(v), z.number().positive("Quantity must be positive")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

// ── Appointments ──
export const appointmentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .regex(/^[\d\s()+\-]+$/, "Please enter a valid phone number"),
  service: z.string().optional(),
  business: z.enum(["ultratidy", "dba", "primefield"]).optional(),
  appointment_date: z.string().min(1, "Please select a date"),
  appointment_time: z.string().min(1, "Please select a time slot"),
  notes: z.string().optional(),
});

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;

// ── Primefield lead form ──
export const primefieldLeadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .regex(/^[\d\s()+\-]+$/, "Please enter a valid phone number"),
  interest: z.string().min(1, "Please select your interest"),
  message: z.string().optional(),
});

export type PrimefieldLeadFormValues = z.infer<typeof primefieldLeadSchema>;

// ── Change Username (admin self-service) ──
export const changeUsernameSchema = z.object({
  newUsername: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or less")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
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
  suspended: z.boolean().optional(),
});

export const managerResetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});

// ── Appointment update (admin) ──
export const appointmentUpdateSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  notes: z.string().max(2000).nullable().optional(),
  appointment_date: z.string().max(30).optional(),
  appointment_time: z.string().max(50).optional(),
});
