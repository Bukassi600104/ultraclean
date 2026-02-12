import { z } from "zod";

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
