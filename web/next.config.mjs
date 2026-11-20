/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // @metamask/sdk (kéo theo qua @wagmi/connectors) require các package chỉ có ở Node
    // ('encoding', 'pino-pretty') — trong browser không bao giờ chạy tới, đánh dấu "không cần resolve".
    // Fix lỗi build trên Vercel: "Module not found: Can't resolve 'encoding'".
    config.resolve.fallback = {
      ...config.resolve.fallback,
      encoding: false,
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;
