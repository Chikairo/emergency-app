import { expect, test } from "@playwright/test";

// Smoke coverage for the emergency-first flow. Mock services only —
// no real calls, dispatch, or notifications leave this machine.
test("home shows the emergency action immediately", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Report an emergency now" }).first(),
  ).toBeVisible();
});

test("one-tap report creates an incident and shows status plus quick questions", async ({
  page,
}) => {
  await page.goto("/report");
  const help = page.getByRole("button", { name: "Get Emergency Help" });
  await expect(help).toBeEnabled();
  await help.click();
  await expect(page).toHaveURL(/\/incidents\/.+/);
  await expect(page.getByText("Request started")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Quick questions" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What to do right now" }),
  ).toBeVisible();
});

test("tap triage records urgency without blocking help", async ({ page }) => {
  await page.goto("/report");
  const help = page.getByRole("button", { name: "Get Emergency Help" });
  await expect(help).toBeEnabled();
  await help.click();
  await expect(page).toHaveURL(/\/incidents\/.+/);
  // Help is visible before triage finishes.
  await expect(page.getByRole("heading", { name: "What to do right now" })).toBeVisible();
  // Answer each presented question in turn.
  await expect(page.getByText("Is the person awake and responding to you?")).toBeVisible();
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page.getByText("Are they breathing normally?")).toBeVisible();
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page.getByText("Is there severe bleeding you can see?")).toBeVisible();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByText("Was this a crash, a fall, or something else?")).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByText("Do you know where you are right now?")).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByText(/Reported urgency:/)).toBeVisible();
  await expect(page.getByText(/not a diagnosis/i)).toBeVisible();
});

test("guidance page shows versioned sample steps with review warning", async ({
  page,
}) => {
  await page.goto("/guidance");
  await expect(page.getByRole("heading", { name: "First-aid guidance" })).toBeVisible();
  await expect(page.getByText(/not clinically reviewed/i)).toBeVisible();
});
