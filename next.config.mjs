/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ideogram.ai" },
      { protocol: "https", hostname: "*.ideogram.ai" },
    ],
  },
  // Native module — keep external so Next doesn't try to bundle the binary.
  experimental: {
    serverComponentsExternalPackages: ["@napi-rs/canvas"],
  },
};

export default nextConfig;
