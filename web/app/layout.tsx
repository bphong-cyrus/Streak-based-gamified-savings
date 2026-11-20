import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Savient — Tiết kiệm mọc nhà",
  description:
    "Gửi tiền đều mỗi kỳ, giữ streak, xây tòa nhà 3D của bạn trên Avalanche Fuji. Streak càng dài, phần thưởng lãi càng lớn — gốc luôn của bạn, rút anytime.",
  applicationName: "Savient",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Savient",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Savient — Tiết kiệm mọc nhà",
    description:
      "Streak-based gamified savings trên Avalanche: gửi đều mỗi kỳ → +1 tầng nhà 3D, streak càng dài thưởng càng lớn.",
    type: "website",
    images: ["/icons/icon-512.png"],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#285A44",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Quicksand:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={
          {
            "--font-baloo": "'Baloo 2'",
            "--font-quicksand": "'Quicksand'",
          } as React.CSSProperties
        }
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                const p = new URLSearchParams(location.search);
                if (p.has('night')) { document.documentElement.classList.add('night-ui'); return; }
                if (p.has('day')) { document.documentElement.classList.remove('night-ui'); return; }
                const saved = localStorage.getItem('cozy-theme');
                if (saved === 'night' || (saved !== 'day' && (new Date().getHours() >= 18 || new Date().getHours() < 6))) {
                  document.documentElement.classList.add('night-ui');
                }
              })();
            `,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
