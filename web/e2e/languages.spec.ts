import { expect, test } from "@playwright/test";

const locales = [
  ["vi", "vi-VN", "ltr", "Nhà"],
  ["en", "en", "ltr", "Home"],
  ["zh", "zh-Hans", "ltr", "首页"],
  ["hi", "hi", "ltr", "होम"],
  ["es", "es", "ltr", "Inicio"],
  ["ar", "ar", "rtl", "الرئيسية"],
  ["fr", "fr", "ltr", "Accueil"],
  ["bn", "bn", "ltr", "হোম"],
  ["pt", "pt", "ltr", "Início"],
  ["id", "id", "ltr", "Beranda"],
  ["ur", "ur", "rtl", "ہوم"],
] as const;

test("all languages update the visible app and survive reload", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("cozy-onboarded", "1"));
  await page.goto("/?demo=1");

  const picker = page.locator('[data-testid="language-picker"]:visible');
  const navigation = page.getByRole("navigation");
  const root = page.locator("html");
  await expect(picker.locator("option")).toHaveCount(locales.length);
  await expect(picker).toHaveValue("vi");

  for (const [language, lang, direction, home] of locales) {
    await picker.selectOption(language);
    await expect(root).toHaveAttribute("lang", lang);
    await expect(root).toHaveAttribute("dir", direction);
    await expect(navigation.getByRole("button", { name: home, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("floor-badge")).toBeVisible();

    for (const tab of [1, 2, 3, 0]) {
      const button = navigation.getByRole("button").nth(tab);
      await button.click();
      await expect(button).toHaveAttribute("aria-current", "page");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
      await expect(page.locator("main")).not.toContainText(/ZXQ\d+QXZ|\{\d+\}/);
    }
  }

  await page.reload();
  await expect(picker).toHaveValue("ur");
  await expect(root).toHaveAttribute("dir", "rtl");
  await expect(navigation.getByRole("button", { name: "ہوم", exact: true })).toBeVisible();
  await picker.selectOption("vi");
  await expect(root).toHaveAttribute("dir", "ltr");
  expect(errors).toEqual([]);
});

test("English covers landing, wallet feedback, tutorial and demo savings", async ({ page }) => {
  await page.goto("/");
  const picker = page.locator('[data-testid="language-picker"]:visible');
  await picker.focus();
  await picker.press("ArrowDown");
  await expect(picker).toHaveValue("en");
  await expect(page.getByTestId("try-demo")).toHaveText("Try the demo (sample data)");

  await page.getByTestId("connect-cta").click();
  await expect(page.getByRole("alert").filter({ hasText: /wallet/i })).toBeVisible();
  await page.getByTestId("try-demo").click();

  const tutorial = page.getByRole("dialog", { name: "Savient tutorial" });
  await expect(tutorial.getByText("Set your savings target")).toBeVisible();
  await tutorial.getByRole("button", { name: "Next" }).click();
  await expect(tutorial.getByText("Deposit before the deadline")).toBeVisible();
  await tutorial.getByRole("button", { name: "Next" }).click();
  await tutorial.getByRole("button", { name: "Get started" }).click();

  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await nav.getByRole("button", { name: "Goals" }).click();
  await expect(page.getByText("Savings target per period")).toBeVisible();
  await nav.getByRole("button", { name: "Rewards" }).click();
  await expect(page.getByText("Lucky Wheel", { exact: true })).toBeVisible();
  await nav.getByRole("button", { name: "Profile" }).click();
  await expect(page.getByText("Choose a character")).toBeVisible();
  await nav.getByRole("button", { name: "Home" }).click();
  await expect(page.getByTestId("floor-badge")).toContainText("3");

  await page.getByRole("button", { name: "Simulate deposit" }).click();
  await expect(page.getByText("Target met · Awaiting finalization")).toBeVisible();
  await expect(page.getByTestId("floor-badge")).toContainText("3");
  await page.getByTestId("demo-settle").click();
  await expect(page.getByText("PERIOD FINALIZED!")).toBeVisible();
  await expect(page.getByTestId("floor-badge")).toContainText("4");

  await page.goto("/?demo=1");
  await page.goBack();
  await expect(page.getByTestId("try-demo")).toHaveText("Try the demo (sample data)");
});

test("a mocked wallet reports pending, rejection, wrong network and disconnect in English", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("savient-language", "en");
    localStorage.setItem("cozy-onboarded", "1");

    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const account = "0x0000000000000000000000000000000000000001";
    let chainId = "0x1";
    let prompted = false;
    let connected = false;

    const provider = {
      on(event: string, listener: (...args: unknown[]) => void) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(listener);
      },
      removeListener(event: string, listener: (...args: unknown[]) => void) {
        listeners.get(event)?.delete(listener);
      },
      async request({ method, params }: { method: string; params?: [{ chainId: string }] }) {
        switch (method) {
          case "eth_chainId": return chainId;
          case "eth_accounts": return connected ? [account] : [];
          case "wallet_requestPermissions":
            throw Object.assign(new Error("Unsupported method"), { code: 4200 });
          case "eth_requestAccounts":
            if (!prompted) {
              prompted = true;
              await new Promise((resolve) => setTimeout(resolve, 750));
              throw Object.assign(new Error("User rejected the request"), { code: 4001 });
            }
            connected = true;
            return [account];
          case "wallet_switchEthereumChain":
            chainId = params![0].chainId;
            listeners.get("chainChanged")?.forEach((listener) => listener(chainId));
            return null;
          default:
            throw new Error(`Unexpected wallet request: ${method}`);
        }
      },
    };

    Object.defineProperty(window, "ethereum", { value: provider });
  });

  await page.goto("/");
  const connect = page.getByTestId("connect-cta");
  await connect.click();
  await expect(connect).toHaveText("Opening wallet…");
  await expect(connect).toBeDisabled();
  await expect(page.getByRole("alert").filter({ hasText: "You canceled the request" })).toBeVisible();

  await connect.click();
  await expect(page.getByText("You're on a different network")).toBeVisible();
  await page.getByRole("button", { name: "Switch Avalanche Fuji" }).click();

  const disconnect = page.locator('[data-testid="disconnect-btn"]:visible');
  await expect(disconnect).toHaveText("Disconnect");
  await disconnect.click();
  await expect(disconnect).toHaveText("Confirm disconnect?");
  await disconnect.click();
  await expect(connect).toBeVisible();
});

test("the saved language loads after a slow first visit and invalid preferences use Vietnamese", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("savient-language", "invalid"));
  await page.route("**/_next/static/**/*.js", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 450));
    await route.continue();
  });
  await page.goto("/");
  const picker = page.locator('[data-testid="language-picker"]:visible');
  await expect(picker).toHaveValue("vi");
  await expect(page.getByTestId("try-demo")).toHaveText("Xem bản thử (dữ liệu mẫu)");
  await picker.selectOption("ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByTestId("try-demo")).not.toHaveText("Xem bản thử (dữ liệu mẫu)");
});
