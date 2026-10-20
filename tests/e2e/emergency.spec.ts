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
  // Dev-server cold compile can exceed the default 5s timeout on first hit.
  await expect(page).toHaveURL(/\/incidents\/.+/, { timeout: 30000 });
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
  // Dev-server cold compile can exceed the default 5s timeout on first hit.
  await expect(page).toHaveURL(/\/incidents\/.+/, { timeout: 30000 });
  // Help is visible before triage finishes.
  await expect(page.getByRole("heading", { name: "What to do right now" })).toBeVisible();
  // Answer each presented question in turn. Each answer round-trips the
  // server, so every gate carries a generous timeout on slow machines.
  await expect(page.getByText("Is the person awake and responding to you?")).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page.getByText("Are they breathing normally?")).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page.getByText("Is there severe bleeding you can see?")).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByText("Was this a crash, a fall, or something else?")).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByText("Do you know where you are right now?")).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByText(/Reported urgency:/)).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/not a diagnosis/i)).toBeVisible();
});

test("contact confirmation is user-reported with honest doctor fallback", async ({
  page,
}) => {
  await page.goto("/report");
  const help = page.getByRole("button", { name: "Get Emergency Help" });
  await expect(help).toBeEnabled();
  await help.click();
  await expect(page).toHaveURL(/\/incidents\/.+/, { timeout: 30000 });
  // No invented emergency number anywhere.
  await expect(page.getByRole("link", { name: /call 000-mock/i })).not.toBeVisible();
  // Manual outcome choices, labelled as user-reported only after choosing.
  await page.getByRole("button", { name: "Help is coming" }).click();
  await expect(page.getByText(/your own report/i)).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/not verified by the emergency network/i)).toBeVisible();
  // Doctor contact is always visible with an honest unconfigured fallback.
  await expect(page.getByText("Call the doctor directly")).toBeVisible();
  await expect(page.getByText(/not available yet/i)).toBeVisible();
  // Optional local-only camera check, never presented as a live call.
  await expect(page.getByRole("button", { name: "Check my camera" })).toBeVisible();
  // Real video call surfaces honest unconfigured state (no credentials in dev).
  await page.getByRole("button", { name: "Start video consultation" }).click();
  await expect(page.getByText(/not configured/i)).toBeVisible({ timeout: 30000 });
});

test("guidance page shows versioned sample steps with review warning", async ({
  page,
}) => {
  await page.goto("/guidance");
  await expect(page.getByRole("heading", { name: "First-aid guidance" })).toBeVisible();
  await expect(page.getByText(/not clinically reviewed/i)).toBeVisible();
});
