import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    optimizePackageImports: ["recharts", "framer-motion", "date-fns"],
  },
  serverExternalPackages: ["tesseract.js", "tesseract.js-core"],
  outputFileTracingIncludes: {
    "/api/line/webhook": [
      "./node_modules/tesseract.js/src/**/*",
      "./node_modules/tesseract.js-core/**/*",
      "./node_modules/wasm-feature-detect/**/*",
      "./node_modules/zlibjs/**/*",
      "./node_modules/@tesseract.js-data/eng/4.0.0/**/*",
      "./node_modules/@tesseract.js-data/tha/4.0.0/**/*",
    ],
  },
};

export default nextConfig;
