import { expect, test } from "@playwright/test";

// First-screen and immediate-guidance coverage. All pages here are static:
// no reports are created and no database is touched.
test("first screen prioritizes emergency action and type choices", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Help is closer than you think." })).toBeVisible();
  await expect(page.getByText("FirstLink").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Report an emergency now" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Staff sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Staff sign in" })).toHaveAttribute(
    "href",
    "/sign-in?next=/ops",
  );
  for (const label of ["Unconscious", "Severe bleeding", "Can't breathe", "Something else"]) {
    await expect(page.getByRole("button", { name: new RegExp(label) }).first()).toBeVisible();
  }
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Install FirstLink" })).toBeVisible();
  await expect(page.getByText(/Call for help directly/)).toHaveCount(0);
  // Staff/dev routes stay out of the emergency area.
  await expect(page.getByRole("link", { name: /operations/i })).not.toBeVisible();
  await expect(page.getByRole("link", { name: /design system/i })).not.toBeVisible();
  await expect(page.getByText(/DRAFT SAMPLE — NOT clinically reviewed/i)).toBeVisible();
});

test("client home and staff sign-in remain usable at mobile, tablet, and desktop widths", async ({ page }) => {
  for (const route of ["/", "/sign-in", "/staff-setup"]) {
    await page.goto(route);
    for (let width = 320; width <= 1600; width += 40) {
      await page.setViewportSize({ width, height: 900 });
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasHorizontalOverflow, `${route} overflows at ${width}px`).toBe(false);
    }
  }
});

test("staff sign-in submits by keyboard and shows rejected credentials clearly", async ({ page }) => {
  await page.route("**/api/auth/**", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" }),
    }),
  );
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("staff@example.test");
  await page.getByLabel("Password").fill("invalid-password");
  await page.getByLabel("Password").press("Enter");
  await expect(page.getByText("Invalid email or password", { exact: true })).toBeVisible();
});

test("install button gives desktop-specific browser installation guidance", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Install FirstLink" }).click();
  await expect(page.getByText(/address-bar install icon to install FirstLink/i)).toBeVisible();
  await expect(page.getByText(/no app-store account is needed/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Install the app" })).toHaveCount(0);
});

test("install button gives iPhone-specific Home Screen instructions", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Install FirstLink" }).click();
  await expect(page.getByText(/Open this page in Safari/i)).toBeVisible();
  await expect(page.getByText(/Add to Home Screen/i)).toBeVisible();
});

test("install button opens the browser install prompt when available", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Install FirstLink" })).toBeVisible();
  await page.getByRole("button", { name: "Install FirstLink" }).click();
  await expect(page.getByText(/address-bar install icon/i)).toBeVisible();
  await page.evaluate(() => {
    const promptEvent = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" }>;
    };
    promptEvent.prompt = async () => {};
    promptEvent.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(promptEvent);
  });
  await page.getByRole("button", { name: "Install FirstLink" }).click();
  await expect(page.getByRole("status").getByText("Installation started.")).toBeVisible();
});

test("install button gives Android browser installation instructions", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile",
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Install FirstLink" }).click();
  await expect(page.getByText(/browser menu and tap/i)).toBeVisible();
  await expect(page.getByText(/Add to Home screen/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Download the APK" })).toHaveAttribute(
    "href",
    "https://github.com/Chikairo/emergency-app/releases/download/android-v0.1.3/emergency-care-android.apk",
  );
});

test("staff account setup is linked from sign-in and reports when local-only setup is disabled", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("link", { name: "Create staff account" })).toHaveAttribute(
    "href",
    "/staff-setup",
  );
  await page.goto("/staff-setup");
  await expect(page).toHaveURL(/\/staff-setup$/);
  await expect(page.getByRole("heading", { name: "Set up a system administrator account" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Local staff setup is disabled" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create system administrator account" })).toHaveCount(0);
});

test("severe bleeding shows existing reviewed-pending steps honestly", async ({ page }) => {
  await page.goto("/help/severe-bleeding");
  await expect(page.getByRole("heading", { name: "What to do right now" })).toBeVisible();
  await expect(page.getByText(/firm pressure/i)).toBeVisible();
  await expect(page.getByText(/not clinically reviewed/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Report this emergency" })).toBeVisible();
});

test("unconsciousness is flagged missing, never invented", async ({ page }) => {
  await page.goto("/help/unconscious");
  await expect(page.getByText(/not available in this app yet/i)).toBeVisible();
  await expect(page.getByText(/call your local emergency number immediately/i)).toBeVisible();
  // No invented step list.
  await expect(page.getByText(/Step 1/)).not.toBeVisible();
});

test("unknown emergency type is a clean 404", async ({ page }) => {
  const res = await page.goto("/help/nonexistent");
  expect(res?.status()).toBe(404);
});
