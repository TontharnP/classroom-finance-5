import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/api/line/webhook": [
      "./node_modules/@tesseract.js-data/eng/4.0.0/**/*",
      "./node_modules/@tesseract.js-data/tha/4.0.0/**/*",
    ],
  },
};

export default nextConfig;
