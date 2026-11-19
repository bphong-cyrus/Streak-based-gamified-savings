"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "day" | "night";

function initialTheme(): ThemeMode {
  if (typeof window === "undefined") return "day";
  // ?night=1 hoặc ?day=1 để ép chế độ (test/pitch)
  const forced = new URLSearchParams(window.location.search).get("night");
  if (forced !== null) return "night";
  if (new URLSearchParams(window.location.search).has("day")) return "day";
  const saved = localStorage.getItem("cozy-theme");
  if (saved === "day" || saved === "night") return saved;
  const h = new Date().getHours();
  return h >= 18 || h < 6 ? "night" : "day";
}

/** Theme duy nhất của app: bầu trờ, tòa nhà và mọi tab cùng dùng một state. */
export function useCozyTheme(): [ThemeMode, (t: ThemeMode) => void] {
  const [theme, setTheme] = useState<ThemeMode>("day");
  useEffect(() => setTheme(initialTheme()), []);
  const change = useCallback((t: ThemeMode) => {
    setTheme(t);
    localStorage.setItem("cozy-theme", t);
  }, []);
  return [theme, change];
}
