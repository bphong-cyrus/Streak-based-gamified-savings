"use client";

import { useEffect, useState } from "react";

/** Theme ban đầu cho landing (theo giờ máy, lấy từ localStorage nếu có). */
export function useThemeLanding(): boolean {
  const [night, setNight] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("cozy-theme");
    if (saved === "day" || saved === "night") {
      setNight(saved === "night");
    } else {
      const h = new Date().getHours();
      setNight(h >= 18 || h < 6);
    }
  }, []);
  return night;
}
