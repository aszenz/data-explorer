import { test, expect } from "@playwright/test";

test("Home page loads", async ({ page }) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Data Models" }),
  ).toBeVisible();
});

test("Model page loads", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Data model invoices" }).click();
  // Wait for model page to load
  await expect(
    page.getByRole("heading", { name: "Malloy model invoices" }),
  ).toBeVisible({ timeout: 15 * 1000 });
  // Verify data sources section is visible
  await expect(
    page.getByRole("button", { name: /Data Sources/ }),
  ).toBeVisible();
});

test("Preview page loads", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Data model invoices" }).click();
  await page.getByRole("button", { name: /Preview/ }).click({
    timeout: 15 * 1000,
  });
  // Verify preview page loaded with heading and table data
  await expect(page.getByRole("heading", { name: "invoices" })).toBeVisible();
  await expect(page.getByText("Preview")).toBeVisible();
  // Verify table has data
  await expect(page.getByText("invoice_id")).toBeVisible();
});

test("Query page loads", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Data model invoices" }).click();
  // Click on by_status query view
  await page.getByRole("button", { name: "by_status" }).click({
    timeout: 15 * 1000,
  });
  // Verify query result page loaded - check for Results tab and Download CSV
  await expect(
    page.getByRole("tab", { name: "Results", selected: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Download CSV" })).toBeVisible();
});

test.describe("Explorer page", () => {
  test("Explorer page loads", async ({ page }) => {
    // Navigate directly to explorer page
    await page.goto("./#/model/invoices/explorer/invoices");
    // Verify explorer page loaded - check for bookmarked views section
    await expect(page.getByText("Start with a Bookmarked View")).toBeVisible({
      timeout: 15 * 1000,
    });
    // Verify there are view options available - check for Add button
    await expect(
      page.getByRole("button", { name: "Add" }).first(),
    ).toBeVisible();
  });
  test("Change visualization", async ({ page }) => {
    await page.goto(
      "./#/model/invoices/explorer/invoices?query=run:invoices->by_status&run=true",
    );
    // Wait for loader to disappear if it appears
    await page
      .getByTestId("loader")
      .waitFor({ state: "hidden", timeout: 15000 })
      .catch(() => {
        // Loader might not appear if page loads too quickly
      });
    await page
      .getByTestId("icon-primary-filterSliders")
      .locator(":visible")
      .click();
    await page.getByRole("combobox").filter({ hasText: "Table" }).click();
    await page.getByRole("option", { name: "Dashboard" }).click();
    await expect(page.getByText("Query was updated.")).toBeVisible();
    await page.getByRole("button", { name: "Run" }).click();
    await expect(
      page.getByRole("combobox").filter({ hasText: "Dashboard" }),
    ).toBeVisible();
    await expect(page.getByText("Query was updated.")).not.toBeVisible();
  });
});

test.describe("Notebook page", () => {
  test("Notebook page loads", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("link", { name: "Notebook Invoices" }).click();
    // Verify notebook loaded - check for notebook title
    await expect(
      page.getByRole("heading", { name: "Invoice Analysis" }),
    ).toBeVisible({ timeout: 15 * 1000 });
    // Verify first section is visible
    await expect(
      page.getByRole("heading", { name: "1. Data Preview" }),
    ).toBeVisible();
  });
  test("Opening notebook cell in expanded view", async ({ page }) => {
    // Cell 3 is a query cell (Data Preview query)
    await page.goto("./#/notebook/Invoices?cell-expanded=3");
    await expect(page.getByTestId("notebook-cell-popover-3")).toBeVisible({
      timeout: 20 * 1000,
    });
  });
});
