import { expect, test } from "@playwright/test";

// Full demo journey across two isolated browser contexts (patient +
// agency), syncing through the API. Fake media device covers the
// consultation preview; file-scoped flags leave shared config untouched.
test.use({
  launchOptions: {
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  },
});

test("demo syncs across patient and agency sessions", async ({ browser, baseURL }) => {
  const create = await (
    await fetch(`${baseURL}/api/demo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination: "demo-hospital-ikeja",
        idempotencyKey: `e2e-demo-${Date.now()}`,
      }),
    })
  ).json();
  const { id, patientUrl, agencyUrl } = create.demo as {
    id: string;
    patientUrl: string;
    agencyUrl: string;
  };
  void id;

  const patient = await (await browser.newContext()).newPage();
  const agency = await (await browser.newContext()).newPage();
  await patient.goto(patientUrl);
  await agency.goto(agencyUrl);

  await expect(patient.getByText("Waiting for the agency")).toBeVisible({ timeout: 30000 });
  await expect(
    agency.getByRole("region", { name: "Agency controls" }).getByText("Is a response vehicle available?"),
  ).toBeVisible({ timeout: 30000 });

  await agency.getByRole("button", { name: "YES — DISPATCH VAN" }).click();
  await expect(patient.getByText(/en route/i).first()).toBeVisible({ timeout: 30000 });

  await agency.getByRole("button", { name: "Advance journey" }).click();
  await expect(patient.getByText(/25%/).first()).toBeVisible({ timeout: 30000 });

  await agency.getByRole("button", { name: "Mark vehicle arrived" }).click();
  await expect(patient.getByText("Demo van arrived.")).toBeVisible({ timeout: 30000 });
  await expect(patient.getByText("Agency approved dispatch (simulated).")).toBeVisible();
  await expect(patient.getByText("Agency confirmed vehicle arrival (simulated).")).toBeVisible();

  await agency.close();
  await patient.close();
});

test("doctor contact reports unconfigured number honestly", async ({ page, baseURL }) => {
  const create = await (
    await fetch(`${baseURL}/api/demo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination: "demo-centre-yaba",
        idempotencyKey: `e2e-demo-doc-${Date.now()}`,
      }),
    })
  ).json();
  await page.goto(create.demo.patientUrl);
  await expect(page.getByRole("heading", { name: "Doctor contact" })).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Contact doctor on WhatsApp" }).click();
  await expect(page.getByText(/not configured/i)).toBeVisible({ timeout: 30000 });
});
