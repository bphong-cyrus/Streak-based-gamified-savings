import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const OUT = join(process.cwd(), "screenshots");
const BASE = "http://localhost:3003";

async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log("✓", path);
}

async function skipOnboarding(page) {
  await page.addInitScript(() => {
    localStorage.setItem("cozy-onboarded", "1");
  });
}

async function openDemo(page, qs = "") {
  const night = qs.includes("night=1");
  await page.addInitScript((isNight) => {
    localStorage.setItem("cozy-onboarded", "1");
    localStorage.setItem("cozy-theme", isNight ? "night" : "day");
  }, night);
  await page.goto(`${BASE}/?demo=1${qs ? "&" + qs : ""}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
}

async function clickTab(page, name) {
  const btn = page.locator("button", { hasText: new RegExp(`^${name}$`) }).first();
  await btn.waitFor({ state: "visible" });
  await btn.click();
  await page.waitForTimeout(700);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=swiftshader", "--use-angle=swiftshader"],
  });

  // Desktop day — 4 tabs
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await openDemo(desktop);
  await shot(desktop, "01-home-day-desktop");
  await clickTab(desktop, "Mục tiêu");
  await shot(desktop, "02-goals-desktop");
  await clickTab(desktop, "Thưởng");
  await shot(desktop, "03-rewards-desktop");
  await clickTab(desktop, "Hồ sơ");
  await shot(desktop, "04-me-desktop");
  await desktop.close();

  // Desktop night — Home
  const nightDesk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await openDemo(nightDesk, "night=1");
  await shot(nightDesk, "05-home-night-desktop");
  await nightDesk.close();

  // Mobile sizes
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await openDemo(mobile);
  await shot(mobile, "06-home-day-mobile-390");
  // open deposit sheet
  const depositBtn = mobile.locator("button", { hasText: /Mô phỏng gửi tiền/ }).first();
  await depositBtn.click();
  await mobile.waitForTimeout(500);
  await shot(mobile, "07-deposit-sheet-mobile-390");
  await mobile.close();

  const tiny = await browser.newPage({ viewport: { width: 320, height: 568 }, isMobile: true });
  await openDemo(tiny);
  await shot(tiny, "08-home-mobile-320");
  await tiny.close();

  const tablet = await browser.newPage({ viewport: { width: 768, height: 1024 }, isMobile: true });
  await openDemo(tablet);
  await shot(tablet, "09-home-tablet-768");
  await tablet.close();

  await browser.close();
  console.log("Done. Output:", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
