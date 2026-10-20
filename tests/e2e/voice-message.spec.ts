import { expect, test } from "@playwright/test";

// Voice-message recorder coverage. Uses Chromium's fake media device so no
// real microphone is needed; scoped to this file via test.use (the shared
// playwright.config.ts is untouched).
test.use({
  launchOptions: {
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  },
});

test("voice message records locally with honest not-sent messaging", async ({ page }) => {
  await page.goto("/report");
  const help = page.getByRole("button", { name: "Get Emergency Help" });
  await expect(help).toBeEnabled();
  await help.click();
  // Dev-server cold compile can exceed the default 5s timeout on first hit.
  await expect(page).toHaveURL(/\/incidents\/.+/, { timeout: 30000 });

  const section = page.getByRole("region", { name: "Voice message" });
  await expect(section).toBeVisible();
  await expect(
    section.getByText(/stays on this device temporarily/i),
  ).toBeVisible();
  await expect(section.getByText(/responders cannot hear it/i)).toBeVisible();

  await section.getByRole("button", { name: "Record a voice message" }).click();
  await expect(section.getByRole("button", { name: "Stop recording" })).toBeVisible();
  await section.getByRole("button", { name: "Stop recording" }).click();

  await expect(section.getByLabel("Voice message playback")).toBeVisible();
  await expect(
    section.getByRole("button", { name: "Record again" }),
  ).toBeVisible();

  await section.getByRole("button", { name: "Discard voice message" }).click();
  await expect(
    section.getByRole("button", { name: "Record a voice message" }),
  ).toBeVisible();
});
