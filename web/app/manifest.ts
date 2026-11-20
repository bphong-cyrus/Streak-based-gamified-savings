import type { MetadataRoute } from "next";

/** PWA manifest — cài Savient về màn hình chính như một app thật. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Savient",
    short_name: "Savient",
    description:
      "Gửi tiền đều mỗi kỳ, giữ streak, xây tòa nhà 3D của bạn trên Avalanche. Streak càng dài, phần thưởng lãi càng lớn.",
    start_url: "/",
    display: "standalone",
    background_color: "#63b8f0",
    theme_color: "#7fd8a4",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
