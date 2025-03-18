import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,
  output: "standalone",
  outputFileTracingRoot:
    process.env.NODE_ENV === "development"
      ? path.join(__dirname, "../")
      : undefined,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "noousr.noo.eu",
        port: "",
        pathname: "/**",
        search: "",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
