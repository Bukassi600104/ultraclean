import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Production subdomain rewriting
  const hostname = request.headers.get("host") || "";
  if (hostname.startsWith("leads.")) {
    const url = request.nextUrl.clone();
    url.pathname = `/dashboard${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }
  if (hostname.startsWith("farm.")) {
    const url = request.nextUrl.clone();
    url.pathname = `/manager${pathname === "/" ? "/sales" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // Refresh session
  const result = await updateSession(request);
  const { supabaseResponse, user, supabase } = result;

  // Login page: redirect if already authenticated
  if (pathname === "/login") {
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname =
        profile?.role === "manager" ? "/manager/sales" : "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  // Protected routes: /dashboard/*
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    return supabaseResponse;
  }

  // Protected routes: /manager/*
  if (pathname.startsWith("/manager")) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "manager" && profile.role !== "admin")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/manager/:path*",
    "/login",
    "/auth/:path*",
  ],
};
