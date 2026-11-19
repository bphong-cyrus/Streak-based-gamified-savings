import { test, expect, type Page } from "@playwright/test";

function collectViolations(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ứng dụng Cozy Save phải không có console.error nào trong quá trình QA.
      errors.push(`[console.error] ${text}`);
    }
  });
  page.on("pageerror", (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  page.on("response", (res) => {
    const status = res.status();
    if (status >= 400 && !res.url().includes("favicon")) {
      errors.push(`[HTTP ${status}] ${res.url()}`);
    }
  });
  return errors;
}

const clearStorage = async (page: Page) => {
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
};

const goto = async (page: Page, url: string) => {
  await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  await clearStorage(page);
  // Tắt onboarding để không che pointer events; reload để áp dụng cờ.
  await page.evaluate(() => localStorage.setItem("cozy-onboarded", "1"));
  // Stub clipboard cho mọi navigation sau (profile reload vẫn giữ).
  await page.context().addInitScript(() => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText = async () => {};
    }
  });
  await page.reload({ waitUntil: "load", timeout: 60_000 });
  // Đợi canvas 3D / dynamic components mount xong.
  await page.locator("canvas").waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
};

const assertNoViolations = (errors: string[]) => {
  if (errors.length > 0) {
    throw new Error(`QA violations:\n${errors.join("\n")}`);
  }
};

test.describe("Demo mode (?demo=1)", () => {
  test.beforeEach(async ({ page }) => {
    // storage được xóa sau khi navigate trong hàm goto
  });

  test("Dashboard renders 3D house, supports zoom/theme/sound and deposit animation", async ({ page }) => {
    const errors = collectViolations(page);
    await goto(page, "/?demo=1");

    // Header & demo badge
    await expect(page.getByText("Cozy Save")).toBeVisible();
    await expect(page.getByText("Demo")).toBeVisible();

    // 3D canvas render
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThan(100);
    expect(box?.height).toBeGreaterThan(100);

    // Floor badge
    await expect(page.getByText(/Tầng/)).toBeVisible();

    // Zoom controls
    await page.getByRole("button", { name: "Phóng to tòa nhà" }).click();
    await expect(canvas).toBeVisible();
    await page.getByRole("button", { name: "Thu nhỏ tòa nhà" }).click();
    await page.getByRole("button", { name: "Vừa khung hình" }).click();

    // Theme toggle
    const themeBtn = page.getByRole("button", { name: /Chuyển/ });
    const root = page.locator("body > div").first();
    const wasNight = await root.evaluate((el) => el.classList.contains("night-ui"));
    await themeBtn.click();
    await expect
      .poll(async () => (await root.getAttribute("class"))?.includes("night-ui"))
      .toBe(!wasNight);

    // Sound toggle
    const soundBtn = page.getByRole("button", { name: /âm thanh/ });
    const soundLabelBefore = await soundBtn.getAttribute("aria-label");
    await soundBtn.click();
    await expect
      .poll(async () => await soundBtn.getAttribute("aria-label"))
      .not.toBe(soundLabelBefore);

    // Demo deposit -> animation hoàn thành tầng
    const depositBtn = page.getByRole("button", { name: /Mô phỏng gửi tiền/ });
    await expect(depositBtn).toBeVisible();
    await depositBtn.click();
    await expect(page.getByText("TẦNG MỚI HOÀN THÀNH!")).toBeVisible({ timeout: 7_000 });

    assertNoViolations(errors);
  });

  test("Goals tab: quick presets, input validation and demo transaction feedback", async ({ page }) => {
    const errors = collectViolations(page);
    await goto(page, "/?demo=1");
    await page.getByRole("navigation").getByRole("button", { name: "Mục tiêu" }).click();

    await expect(page.getByText(/Mục tiêu kỳ này/)).toBeVisible();

    // Weekly target preset fills input
    await page.getByRole("button", { name: "25 mUSDC" }).first().click();
    const weeklyInput = page.locator('input[placeholder="VD: 5"]').first();
    await expect(weeklyInput).toHaveValue("25");

    // Invalid input disables submit
    await weeklyInput.fill("abc");
    await expect(page.getByRole("button", { name: "Lưu" }).first()).toBeDisabled();
    await weeklyInput.fill("-5");
    await expect(page.getByRole("button", { name: "Lưu" }).first()).toBeDisabled();

    // Valid input -> click -> demo info feedback
    await weeklyInput.fill("10");
    await page.getByRole("button", { name: "Lưu" }).first().click();
    await expect(page.getByText(/Chế độ demo/)).toBeVisible();

    // SavingsGoal: preset + valid deadline enables Cam kết
    // Preset ở SavingsGoal chỉ hiển thị số (không có "mUSDC" sau).
    await page.locator("button", { hasText: /^50$/ }).first().click();
    const goalAmountInput = page.locator('input[placeholder="VD: 50"]').first();
    await expect(goalAmountInput).toHaveValue("50");
    const deadlineInput = page.locator('input[placeholder^="VD:"]').last();
    await deadlineInput.fill("0");
    await expect(page.getByRole("button", { name: "Cam kết" })).toBeDisabled();
    await deadlineInput.fill("999");
    await expect(page.getByRole("button", { name: "Cam kết" })).toBeEnabled();
    await page.getByRole("button", { name: "Cam kết" }).click();
    await expect(page.getByText(/Chế độ demo/).first()).toBeVisible();

    assertNoViolations(errors);
  });

  test("Rewards tab: no negative badges, no stuck skeleton, visible stats", async ({ page }) => {
    const errors = collectViolations(page);
    await goto(page, "/?demo=1");
    await page.getByRole("navigation").getByRole("button", { name: "Thưởng" }).click();

    await expect(page.getByText("Huy hiệu streak")).toBeVisible();
    await expect(page.getByText("Điểm danh mỗi ngày")).toBeVisible();

    // Không có số âm trong badge mốc streak (ví dụ "còn -1 tuần")
    await expect(page.locator("text=/còn -\\d+ tuần/")).toHaveCount(0);

    // Không có skeleton bị kẹt
    await expect(page.locator(".skeleton")).toHaveCount(0);

    // Stats hiển thị rõ (có thể là "—" khi chưa kết nối ví)
    const statLabels = ["Chuỗi ngày", "Thưởng hôm nay", "Pool còn", "Chờ nhận", "Đã nhận", "Ngân sách kỳ này"];
    for (const label of statLabels) {
      await expect(page.getByText(label)).toBeVisible();
    }

    // Nút check-in ở demo hiển thị CTA kết nối vì chưa có ví
    await expect(page.getByRole("button", { name: "Kết nối ví để điểm danh" })).toBeVisible();

    assertNoViolations(errors);
  });

  test("Profile tab: identity selection syncs, persists after reload, theme + Snowtrace copy", async ({ page }) => {
    const errors = collectViolations(page);
    await goto(page, "/?demo=1");
    await page.getByRole("navigation").getByRole("button", { name: "Hồ sơ" }).click();

    await expect(page.getByText("Chọn nhân vật của bạn")).toBeVisible();

    // Click qua 5 nhân vật, kiểm tra tên đồng bộ
    const names = ["Thỏ Cà Phê", "Mèo Công Sở", "Mèo Nông Trại", "Mèo Pháp Sư", "Mèo Hiệp Sĩ"];
    for (const name of names) {
      await page.locator("button", { hasText: name }).click();
      await expect(page.getByText(name).first()).toBeVisible();
    }

    // Chọn Mèo Pháp Sư, reload vẫn giữ
    await page.locator("button", { hasText: "Mèo Pháp Sư" }).click();
    await page.reload({ waitUntil: "load" });
    await page.getByRole("navigation").getByRole("button", { name: "Hồ sơ" }).click();
    await expect(page.getByText("Mèo Pháp Sư").first()).toBeVisible();

    // Theme day/night toggle trong profile
    const root2 = page.locator("body > div").first();
    await page.getByRole("button", { name: /^Ban đêm$/ }).click();
    await expect.poll(async () => (await root2.getAttribute("class"))?.includes("night-ui")).toBe(true);
    await page.getByRole("button", { name: /^Ban ngày$/ }).click();
    await expect.poll(async () => (await root2.getAttribute("class"))?.includes("night-ui")).toBe(false);

    // Snowtrace link & Copy
    const vaultLink = page.locator('a[href*="testnet.snowtrace.io/address/"]').first();
    await expect(vaultLink).toBeVisible();
    const copyBtn = page.locator('button', { hasText: "Copy" }).first();
    await copyBtn.click();
    await expect(page.locator('button', { hasText: "✓" }).first()).toBeVisible();

    assertNoViolations(errors);
  });
});

test.describe("Live mode (no demo param, disconnected wallet)", () => {
  test.beforeEach(async ({ page }) => {
    // storage được xóa sau khi navigate trong hàm goto
  });

  test("Landing prompts connect wallet and navigates all core tabs", async ({ page }) => {
    const errors = collectViolations(page);
    await goto(page, "/");

    // Vì chưa kết nối ví, app vẫn hiển thị dashboard demo với CTA Connect
    await expect(page.getByText("Cozy Save")).toBeVisible();
    await expect(page.getByRole("button", { name: /Kết nối/ })).toBeVisible();

    // Bottom nav dẫn đến đủ 4 tab
    for (const label of ["Nhà", "Mục tiêu", "Thưởng", "Hồ sơ"]) {
      await page.getByRole("navigation").getByRole("button", { name: label }).click();
      await expect(page.getByRole("navigation").getByRole("button", { name: label })).toHaveAttribute("aria-current", "page");
    }

    assertNoViolations(errors);
  });
});
