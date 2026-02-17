import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const BUCKET = "config";
const FILE = "dba-settings.json";

export async function GET() {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ stripe_price_id: "" });
  }

  const { data, error } = await supabase.storage.from(BUCKET).download(FILE);
  if (error) {
    return NextResponse.json({ stripe_price_id: "" });
  }

  const config = JSON.parse(await data.text());
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const priceId = body.stripe_price_id?.trim() || "";

  // Validate price ID format if provided
  if (priceId && !/^price_[a-zA-Z0-9]{8,}$/.test(priceId)) {
    return NextResponse.json(
      { error: "Invalid Stripe Price ID format. It should start with 'price_'" },
      { status: 400 }
    );
  }

  const config = { stripe_price_id: priceId };

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(FILE, JSON.stringify(config), {
      contentType: "application/json",
      upsert: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(config);
}
