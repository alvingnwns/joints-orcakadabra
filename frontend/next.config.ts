import type { NextConfig } from "next";

// On Vercel, a build without the backend URL would still "succeed" but ship an app that calls
// 127.0.0.1 from every visitor's browser. Fail the deploy loudly instead. (VERCEL is set by
// Vercel's build environment only, so local builds and tests are not affected.)
if (process.env.VERCEL) {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "";
  if (!/^https:\/\/[^/\s]+$/.test(api)) {
    throw new Error(
      `NEXT_PUBLIC_API_URL must be the backend's public https URL with no trailing slash ` +
        `(e.g. https://orca-api.up.railway.app). Got: "${api}". ` +
        `Set it in Vercel -> Project Settings -> Environment Variables, then redeploy.`,
    );
  }
}

const nextConfig: NextConfig = {
  /* config options here */
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
