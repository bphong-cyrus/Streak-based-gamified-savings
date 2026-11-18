import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Cozy Save — Tiết kiệm mọc nhà",
  description: "Gửi tiền đều mỗi tuần, xây tòa tháp của riêng bạn và nhận thưởng theo streak.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#63b8f0",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
