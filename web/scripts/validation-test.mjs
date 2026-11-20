import { chromium } from "playwright";

const BASE = "http://localhost:3003";

async function run() {
  const browser = await chromium.launch({ headless: true, args: ["--use-gl=swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.addInitScript(() => {
    localStorage.setItem("cozy-onboarded", "1");
    localStorage.setItem("cozy-theme", "day");
  });
  await page.goto(`${BASE}/?demo=1`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const results = [];

  // Open withdraw sheet (demo CTA now triggers simulation, but withdraw still opens sheet)
  await page.locator("button", { hasText: "Rút gốc" }).first().click();
  await page.waitForTimeout(300);

  // Test Max
  await page.locator("button", { hasText: "Tối đa" }).first().click();
  let val = await page.locator("input[placeholder='0']").inputValue();
  results.push({ test: "Tối đa (25 mUSDC gốc)", pass: val === "25", got: val });

  // Test 0.8
  await page.locator("input[placeholder='0']").fill("0.8");
  val = await page.locator("input[placeholder='0']").inputValue();
  const submitBtn = page.locator("[role='dialog'] button.btn-primary").first();
  const ok0_8 = await submitBtn.isEnabled();
  results.push({ test: "Nhập 0.8", pass: val === "0.8" && ok0_8, got: val, enabled: ok0_8 });

  // Test 0
  await page.locator("input[placeholder='0']").fill("0");
  await page.waitForTimeout(150);
  const err0 = (await page.locator("text=/Vui lòng nhập số hợp lệ|Số tiền phải lớn hơn 0/").count()) > 0;
  const ok0 = await submitBtn.isEnabled();
  results.push({ test: "Nhập 0", pass: err0 && !ok0, got: err0, enabled: ok0 });

  // Test exceeds balance
  await page.locator("input[placeholder='0']").fill("999999");
  await page.waitForTimeout(150);
  const errBig = (await page.locator("text=Vượt quá số dư khả dụng").count()) > 0;
  const okBig = await submitBtn.isEnabled();
  results.push({ test: "Vượt số dư", pass: errBig && !okBig, got: errBig, enabled: okBig });

  // Test too many decimals
  await page.locator("input[placeholder='0']").fill("1.1234567");
  val = await page.locator("input[placeholder='0']").inputValue();
  results.push({ test: "Quá 6 chữ số lẻ", pass: val === "1.123456", got: val });

  await page.close();

  // Desktop rapid demo click
  const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desk.addInitScript(() => {
    localStorage.setItem("cozy-onboarded", "1");
    localStorage.setItem("cozy-theme", "day");
  });
  await desk.goto(`${BASE}/?demo=1`, { waitUntil: "networkidle" });
  await desk.waitForTimeout(1000);
  const floorBefore = await desk.locator("text=/\\d+ tầng/").first().textContent();
  const btn = desk.locator("main button.btn-primary").first();
  await btn.click();
  await desk.waitForTimeout(200);
  const disabled = await btn.isDisabled();
  results.push({ test: "Demo click chặn lặp (disabled sau click)", pass: disabled, got: disabled });
  await desk.waitForTimeout(5000);
  const floorAfter = await desk.locator("text=/\\d+ tầng/").first().textContent();
  results.push({ test: "Demo +1 tầng", pass: floorAfter !== floorBefore, before: floorBefore, after: floorAfter });

  await browser.close();

  console.table(results);
  const all = results.every((r) => r.pass);
  console.log(all ? "✅ Tất cả pass" : "❌ Có test fail");
  process.exit(all ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
