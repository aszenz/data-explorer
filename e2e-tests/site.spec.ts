import { test, expect } from "@playwright/test";

test("Home page loads", async ({ page }) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Data Models" }),
  ).toBeVisible();
});

test("Model page loads", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "invoices" }).click();
  await expect(page.getByText("Loading...")).toBeVisible();
  // wait for loading spinner
  await expect(page.getByText("Loading...")).not.toBeVisible({
    timeout: 15 * 1000,
  });
  await expect(
    page.getByRole("heading", { name: "Malloy model invoices" }),
  ).toBeVisible();
});

test("Preview page loads", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "invoices" }).click();
  await page.getByText("Preview").click({
    timeout: 15 * 1000,
  });
  await expect(
    page.getByRole("heading", { name: "Preview Result for invoices" }),
  ).toBeVisible();
});

test("Query page loads", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "invoices" }).click();
  await page.getByText("All invoices").click({
    timeout: 15 * 1000,
  });
  await expect(
    page.getByRole("heading", { name: "Query Result for All invoices" }),
  ).toBeVisible();
});

test.describe("Explorer page", () => {
  test("Explorer page loads", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("link", { name: "invoices" }).click();
    await page.getByText("by_status").click({
      timeout: 15 * 1000,
    });
    await expect(page.getByRole("heading", { name: "invoices" })).toBeVisible();
  });
  test("Change visualization", async ({ page }) => {
    await page.goto(
      "./#/model/invoices/explorer/invoices?query=run:invoices->by_status&run=true",
    );
    await expect(page.getByText("Loading app...")).toBeVisible();
    await expect(page.getByText("Loading app...")).not.toBeVisible({
      timeout: 15 * 1000,
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

test("Notebook page loads", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Trading Overview" }).click();
  await expect(
    page.getByRole("heading", { name: "Trading Overview" }),
  ).toBeVisible({ timeout: 15 * 1000 });
  await expect(
    page.getByRole("heading", { name: "1. Data preview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "2. By Category" }),
  ).toBeVisible();
});
