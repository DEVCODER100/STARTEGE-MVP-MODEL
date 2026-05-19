/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ideogram.ai",
      },
      {
        protocol: "https",
        hostname: "*.ideogram.ai",
      },
    ],
  },
};

export default nextConfig;
