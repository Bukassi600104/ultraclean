/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "gsxqrjywtugeuexrjcln.supabase.co",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async redirects() {
    return [
      {
        source: "/primefield",
        destination: "https://primefieldagric.com",
        permanent: true,
      },
      {
        source: "/primefield/:path*",
        destination: "https://primefieldagric.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js requires unsafe-inline + unsafe-eval for client-side hydration
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      // Images: self, data URIs, blobs, Supabase storage, Unsplash, Cloudinary
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://res.cloudinary.com",
      // API connections
      "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.resend.com",
      // Only Stripe iframes allowed (payment forms)
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      // Block all plugins/objects (Flash, PDF embeds, etc.)
      "object-src 'none'",
      // Prevent base-tag injection attacks
      "base-uri 'self'",
      // Forms can only submit to same origin
      "form-action 'self'",
      // Block mixed content
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          // Enforce HTTPS for 1 year; include all subdomains
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Prevent cross-domain data reads (e.g. SVG scripts)
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
