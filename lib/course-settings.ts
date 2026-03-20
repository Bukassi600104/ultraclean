import { createServerClient } from "@/lib/supabase/server";

export interface CourseSettings {
  course_name: string;
  price_cents: number;
  currency: string;
  stripe_payment_link?: string;
}

const BUCKET = "config";
const FILE = "dba-settings.json";

const DEFAULTS: CourseSettings = {
  course_name: "Digital Boss Academy Course",
  price_cents: 2000,
  currency: "usd",
  stripe_payment_link: "https://buy.stripe.com/aFa6oH1qjb5jd3a3op3F600",
};

export async function getCourseSettings(): Promise<CourseSettings> {
  const supabase = createServerClient();
  if (!supabase) return DEFAULTS;

  const { data, error } = await supabase.storage.from(BUCKET).download(FILE);
  if (error || !data) return DEFAULTS;

  try {
    const raw = JSON.parse(await data.text());
    return {
      course_name: raw.course_name || DEFAULTS.course_name,
      price_cents:
        typeof raw.price_cents === "number" && raw.price_cents > 0
          ? raw.price_cents
          : DEFAULTS.price_cents,
      currency: raw.currency || DEFAULTS.currency,
      stripe_payment_link: raw.stripe_payment_link || DEFAULTS.stripe_payment_link,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function saveCourseSettings(
  settings: CourseSettings
): Promise<{ error?: string }> {
  const supabase = createServerClient();
  if (!supabase) return { error: "Database not configured" };

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(FILE, JSON.stringify(settings), {
      contentType: "application/json",
      upsert: true,
    });

  if (error) return { error: error.message };
  return {};
}
