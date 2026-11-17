import type { NextConfig } from "next";

// Dev only: hosts you open the dev server from (e.g. your phone on the LAN).
// Set DEV_ORIGINS="192.168.1.104,my-tunnel.example.com" to override.
const devHosts = (process.env.DEV_ORIGINS ?? "192.168.1.104").split(",").map((h) => h.trim()).filter(Boolean);
const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: isDev ? devHosts : [],
  experimental: {
    agentFeedback: true,
    serverActions: {
      // Server Action POSTs compare the Origin host (with port) to the request host.
      allowedOrigins: isDev ? devHosts.flatMap((h) => [h, `${h}:3000`]) : [],
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
