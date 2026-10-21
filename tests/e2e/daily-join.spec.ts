import { expect, test } from "@playwright/test";

test.skip(
  !process.env["DAILY_E2E_ENABLED"],
  "Set DAILY_E2E_ENABLED=1 to run the live Daily consultation smoke test.",
);

test.use({
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});

test("patient joins the Daily consultation", async ({ page }) => {
  await page.goto("/report");
  await page.getByRole("button", { name: "Get Emergency Help" }).click();
  await expect(page).toHaveURL(/\/incidents\/.+/, { timeout: 30000 });

  await page.getByRole("button", { name: "Start video consultation" }).click();
  await expect(page.getByText(/Room ready/)).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Join as patient" }).click();
  await expect(
    page.getByText("Connected — you are in the consultation."),
  ).toBeVisible({ timeout: 60000 });
});
