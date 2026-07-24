import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/sitemap.xml",
        headers: [
          {
            key: "Content-Type",
            value: "application/xml; charset=utf-8",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/server",
        permanent: true,
      },
      // 旧ルートの情報ページ → サーバー図鑑配下へ
      {
        source: "/about",
        destination: "/server/operator",
        permanent: true,
      },
      {
        source: "/privacy",
        destination: "/server/privacy",
        permanent: true,
      },
      {
        source: "/disclaimer",
        destination: "/server/disclaimer",
        permanent: true,
      },
      {
        source: "/contact",
        destination: "/server/contact",
        permanent: true,
      },
      // Legacy admin URLs → サーバー図鑑配下
      {
        source: "/admin/services",
        destination: "/admin/server/services",
        permanent: false,
      },
      {
        source: "/admin/services/:path*",
        destination: "/admin/server/services/:path*",
        permanent: false,
      },
      {
        source: "/admin/comparison-fields",
        destination: "/admin/server/comparison-fields",
        permanent: false,
      },
      {
        source: "/admin/comparison-fields/:path*",
        destination: "/admin/server/comparison-fields/:path*",
        permanent: false,
      },
      {
        source: "/admin/rankings",
        destination: "/admin/server/rankings",
        permanent: false,
      },
      {
        source: "/admin/scraping",
        destination: "/admin/server/scraping",
        permanent: false,
      },
      {
        source: "/admin/spreadsheet",
        destination: "/admin/server/spreadsheet",
        permanent: false,
      },
      {
        source: "/admin/google-sheets",
        destination: "/admin/server/spreadsheet",
        permanent: false,
      },
      {
        source: "/admin/comparison-items",
        destination: "/admin/server/comparison-fields",
        permanent: false,
      },
      {
        source: "/admin/domain/comparison-fields",
        destination: "/admin/domain/comparison-items",
        permanent: false,
      },
      {
        source: "/admin/domain/comparison-fields/:path*",
        destination: "/admin/domain/comparison-items",
        permanent: false,
      },
      {
        source: "/admin/history",
        destination: "/admin/server/history",
        permanent: false,
      },
      {
        source: "/admin/settings",
        destination: "/admin/server/settings",
        permanent: false,
      },
      {
        source: "/admin/categories",
        destination: "/admin/server/categories",
        permanent: false,
      },
      {
        source: "/admin/categories/:path*",
        destination: "/admin/server/categories/:path*",
        permanent: false,
      },
      {
        source: "/admin/contents",
        destination: "/admin/server/contents",
        permanent: false,
      },
      {
        source: "/admin/contents/:path*",
        destination: "/admin/server/contents/:path*",
        permanent: false,
      },
      {
        source: "/admin/bulk-update",
        destination: "/admin/server/bulk-update",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
