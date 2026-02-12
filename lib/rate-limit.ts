import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
  ratelimit = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(5, "10 s"),
    analytics: true,
  });
} else {
  console.warn(
    "Upstash Redis not configured. Rate limiting will be skipped."
  );
}

export async function checkRateLimit(
  identifier: string
): Promise<{ success: boolean; remaining?: number }> {
  if (!ratelimit) {
    return { success: true };
  }

  try {
    const result = await ratelimit.limit(identifier);
    return { success: result.success, remaining: result.remaining };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return { success: true };
  }
}
