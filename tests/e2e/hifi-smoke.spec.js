const { test, expect } = require("@playwright/test");

/** Served by playwright webServer from repo root (see playwright.config.js). */
const HIFI_ENTRY = "/SHOGUN%20Hi-Fi%20UI.html";

async function openHiFi(page) {
  await page.goto(HIFI_ENTRY, { waitUntil: "load", timeout: 90000 });
  await page.waitForSelector(".app", { timeout: 90000 });
}

async function openSettingsModal(page) {
  await page.locator(".user-pill").click();
  await page.locator(".user-float").getByText("Settings", { exact: true }).click();
  await expect(page.locator(".s-modal")).toBeVisible();
}

test.describe("SHOGUN Hi-Fi UI", () => {
  test("mounts app and exposes SHOGUN_RUNTIME", async ({ page }) => {
    const consoleErrors = [];
    page.on("pageerror", (err) => consoleErrors.push(String(err.message)));

    await openHiFi(page);

    const runtime = await page.evaluate(() => {
      const r = window.SHOGUN_RUNTIME;
      if (!r) return null;
      return {
        hasExecute: typeof r.executeAction === "function",
        hasRequestWrite: typeof r.requestWriteAction === "function",
        hasToast: typeof r.pushToast === "function",
      };
    });

    expect(runtime, "SHOGUN_RUNTIME should exist").not.toBeNull();
    expect(runtime.hasExecute).toBe(true);
    expect(runtime.hasRequestWrite).toBe(true);
    expect(runtime.hasToast).toBe(true);

    expect(
      consoleErrors,
      `No uncaught page errors (got: ${consoleErrors.join("; ")})`
    ).toEqual([]);
  });

  test("executeAction resolves for memory.search (mock transport)", async ({
    page,
  }) => {
    await openHiFi(page);

    const result = await page.evaluate(async () => {
      return window.SHOGUN_RUNTIME.executeAction(
        "memory.search",
        { query: "smoke", limit: 3 },
        { silentError: true }
      );
    });

    expect(result.ok).toBe(true);
    expect(result.data).toBeTruthy();
  });

  test("opens Settings from user menu and closes with X", async ({ page }) => {
    await openHiFi(page);

    await openSettingsModal(page);
    await expect(page.locator(".s-pane-head")).toContainText("General");

    await page.locator(".s-close").click();
    await expect(page.locator(".s-modal")).toHaveCount(0);
  });

  test("Hummingbird WRITE confirm opens and Cancel closes", async ({ page }) => {
    await openHiFi(page);

    await page.locator(".page-actions .page-action").first().click();
    await expect(page.locator(".swm-modal")).toBeVisible();
    await expect(page.locator(".swm-header")).toContainText("Open Hummingbird");

    await page.locator(".swm-footer").getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator(".swm-modal")).toHaveCount(0);
  });

  test("Hummingbird WRITE confirm completes on Confirm", async ({ page }) => {
    await openHiFi(page);

    await page.locator(".page-actions .page-action").first().click();
    await expect(page.locator(".swm-modal")).toBeVisible();

    await page.locator(".swm-footer").getByRole("button", { name: "Confirm" }).click();
    await expect(page.locator(".swm-modal")).toHaveCount(0);
    await expect(page.locator(".app-toast.success")).toContainText("Action completed", {
      timeout: 8000,
    });
  });

  test("Data Controls: delete last hour opens WRITE confirm, Cancel closes", async ({
    page,
  }) => {
    await openHiFi(page);
    await openSettingsModal(page);

    await page.locator(".s-sidebar").getByText("Data Controls", { exact: true }).click();
    await expect(page.locator(".s-pane-head")).toContainText("Data Controls");

    await page.locator(".s-pane-body").getByRole("button", { name: "Delete" }).first().click();
    await expect(page.locator(".swm-modal")).toBeVisible();
    await expect(page.locator(".swm-header")).toContainText("Delete last hour");

    await page.locator(".swm-footer").getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator(".swm-modal")).toHaveCount(0);

    await page.locator(".s-close").click();
    await expect(page.locator(".s-modal")).toHaveCount(0);
  });

  test("Share modal opens and closes via backdrop click", async ({ page }) => {
    await openHiFi(page);

    await page.locator(".page-actions .page-action").nth(2).click();
    await expect(page.locator(".share-modal")).toBeVisible();
    await expect(page.locator(".share-modal")).toContainText("Share chat");

    // Backdrop is full-screen under the modal; click main content area (not the right-side panel).
    await page.mouse.click(360, 280);
    await expect(page.locator(".share-modal")).toHaveCount(0);
  });

  test("Share modal Create share link shows success toast", async ({ page }) => {
    await openHiFi(page);

    await page.locator(".page-actions .page-action").nth(2).click();
    await expect(page.locator(".share-modal")).toBeVisible();

    await page.locator(".share-modal").getByRole("button", { name: /Create share link/i }).click();
    await expect(page.locator(".share-modal")).toHaveCount(0);
    await expect(page.locator(".app-toast.success")).toContainText("Share link prepared", {
      timeout: 8000,
    });
  });
});
