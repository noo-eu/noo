import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  outputFileTracingRoot:
    process.env.NODE_ENV === "development"
      ? path.join(__dirname, "../")
      : undefined,
};

export default withNextIntl(nextConfig);
