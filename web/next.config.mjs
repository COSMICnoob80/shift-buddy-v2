import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "test",
  additionalPrecacheEntries: [
    { url: "/protocols/hyperkalemia.json", revision: "1" },
    { url: "/protocols/aki_staging.json", revision: "1" },
    { url: "/protocols/dka.json", revision: "1" },
    { url: "/offline", revision: null },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
