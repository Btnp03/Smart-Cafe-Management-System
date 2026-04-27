import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const remotePatterns = [
  {
    protocol: "https" as const,
    hostname: "images.unsplash.com",
    pathname: "/**",
  },
  ...(supabaseHostname
    ? [
        {
          protocol: "https" as const,
          hostname: supabaseHostname,
          pathname: "/**",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
