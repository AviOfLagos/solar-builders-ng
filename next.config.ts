import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  // Accept the variable names the Vercel Marketplace Stripe integration provisions.
  env: {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || "",
  },
  images: { formats: ["image/avif", "image/webp"] },
  // Fonts for the share pictures are read from disk at runtime.
  outputFileTracingIncludes: { "/api/v1/share/[kind]/[id]": ["./assets/fonts/**"] },
  async headers() {
    return [{ source: "/(.*)", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }] }];
  },
};

// The ops agent in agent/ is served at /eve/v1/* (same origin) and deployed with the site.
export default withEve(nextConfig);
