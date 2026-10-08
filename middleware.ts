import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public installation metadata/scripts must not be rewritten into protected apps.
  if (["/manifest.json", "/farm-manifest.json", "/property-manifest.json", "/content-manifest.json", "/property-sw.js", "/content-sw.js"].includes(pathname)) {
    return NextResponse.next();
  }

  // Production subdomain rewriting
  const hostname = request.headers.get("host") || "";

  const isFarmDomain =
    hostname === "farm.primefieldagric.com";

  const isPrimefieldDomain =
    hostname === "primefieldagric.com" ||
    hostname === "www.primefieldagric.com";

  const isRegisterDomain =
    hostname.startsWith("register.") ||
    hostname === "bboconcepts.com" ||
    hostname === "www.bboconcepts.com";

  if (isFarmDomain) {
    // Refresh session first so we can check auth
    const result = await updateSession(request);
    const { supabaseResponse, user, supabase } = result;

    // Allow the login page through (no auth required)
    if (pathname === "/login") {
      if (user) {
        // Already logged in → redirect to farm home
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/";
        return NextResponse.redirect(redirectUrl);
      }
      const url = request.nextUrl.clone();
      url.pathname = "/manager/login";
      return NextResponse.rewrite(url);
    }

    // All other farm routes require auth
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, suspended")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "manager" && profile.role !== "admin")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    // Deny suspended managers
    if (profile.suspended === true) {
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    // API routes pass through as-is (don't rewrite /api/* to /manager/api/*)
    if (!pathname.startsWith("/api/")) {
      const url = request.nextUrl.clone();
      url.pathname = `/manager${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
    }
    return supabaseResponse;
  }

  // New operational modules have their own server-enforced access boundary.
  const moduleName = pathname === "/property" || pathname.startsWith("/property/")
    ? "property" : pathname === "/content" || pathname.startsWith("/content/") ? "content" : null;
  if (moduleName) {
    const { supabaseResponse, user, supabase } = await updateSession(request);
    if (pathname === `/${moduleName}/login`) return supabaseResponse;
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${moduleName}/login`;
    loginUrl.search = "";
    if (!user) return NextResponse.redirect(loginUrl);
    const { data: profile } = await supabase.from("profiles").select("role, suspended").eq("id", user.id).single();
    if (!profile || profile.suspended === true || (profile.role !== "admin" && profile.role !== `${moduleName}_manager`)) {
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  if (hostname.startsWith("leads.")) {
    const result = await updateSession(request);
    const { supabaseResponse, user, supabase } = result;

    // API routes pass through as-is
    if (pathname.startsWith("/api/")) {
      return supabaseResponse;
    }

    // Login page
    if (pathname === "/login") {
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (profile?.role === "property_manager" || profile?.role === "content_manager") {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = profile.role === "property_manager" ? "/property" : "/content";
          return NextResponse.redirect(redirectUrl);
        }
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/";
        return NextResponse.redirect(redirectUrl);
      }
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.rewrite(url);
    }

    // All other leads routes require admin
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

    // Paths already prefixed with /dashboard pass through as-is
    // (Sidebar links use /dashboard/leads, /dashboard/blog, etc.)
    if (pathname.startsWith("/dashboard")) {
      return supabaseResponse;
    }

    // Redirect (not rewrite) so the browser URL changes to /dashboard/*
    // A rewrite causes usePathname() to disagree between server (/dashboard)
    // and client (original URL), producing a React hydration mismatch.
    const url = request.nextUrl.clone();
    url.pathname = `/dashboard${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  if (isPrimefieldDomain) {
    // API routes pass through as-is
    if (pathname.startsWith("/api/")) {
      const result = await updateSession(request);
      return result.supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = `/primefield${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (isRegisterDomain) {
    // API routes pass through as-is
    if (pathname.startsWith("/api/")) {
      const result = await updateSession(request);
      return result.supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = `/register${pathname === "/" ? "" : pathname}`;
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

      if (profile?.role === "manager") {
        return NextResponse.redirect("https://farm.primefieldagric.com");
      }
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = profile?.role === "property_manager" ? "/property"
        : profile?.role === "content_manager" ? "/content" : "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  // Manager login page: always accessible
  if (pathname === "/manager/login") {
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
