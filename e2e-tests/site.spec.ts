import { test, expect } from "@playwright/test";

test("Home page loads", async ({ page }) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Data Models" }),
  ).toBeVisible();
});

test("Model page loads", async ({ page }) => {
  await page.goto("./");
  await page.getByText("invoices").click();
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
  await page.getByText("invoices").click();
  await page.getByText("Preview").click({
    timeout: 15 * 1000,
  });
  await expect(
    page.getByRole("heading", { name: "Preview Result for invoices" }),
  ).toBeVisible();
});

test("Query page loads", async ({ page }) => {
  await page.goto("./");
  await page.getByText("invoices").click();
  await page.getByText("All invoices").click({
    timeout: 15 * 1000,
  });
  await expect(
    page.getByRole("heading", { name: "Query Result for All invoices" }),
  ).toBeVisible();
});

test("Explorer page loads", async ({ page }) => {
  await page.goto("./");
  await page.getByText("invoices").click();
  await page.getByText("by_status").click({
    timeout: 15 * 1000,
  });
  await expect(page.getByRole("heading", { name: "invoices" })).toBeVisible();
});

test("Notebook page loads", async ({ page }) => {
  await page.goto("./");
  await page.getByText("Trading Overview").click();
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
