/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ideogram.ai" },
      { protocol: "https", hostname: "*.ideogram.ai" },
    ],
  },
  // Native modules — keep them external so Next doesn't try to bundle binaries.
  experimental: {
    serverComponentsExternalPackages: ["sharp", "@resvg/resvg-js"],
  },
};

export default nextConfig;
