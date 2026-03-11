import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  allowedDevOrigins: ["*.replit.dev", "*.repl.co", "*.picard.replit.dev"],
};

export default nextConfig;
