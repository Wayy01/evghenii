import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Phones on the tailnet load the dev server through Tailscale Serve.
  allowedDevOrigins: ["*.ts.net"],
};

export default nextConfig;
