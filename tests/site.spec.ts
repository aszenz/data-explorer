import { test, expect } from "@playwright/test";

test("Home page loads", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByText("Loading...")).toBeVisible();
  // wait for loading spinner
  await expect(page.getByText("Loading...")).not.toBeVisible({
    timeout: 15 * 1000,
  });
  await expect(
    page.getByRole("heading", { name: "Malloy model explorer" }),
  ).toBeVisible();
});

test("Explorer page loads", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByText("Loading...")).toBeVisible();
  // wait for loading spinner
  await expect(page.getByText("Loading...")).not.toBeVisible({
    timeout: 15 * 1000,
  });
  await page.getByText("no_of_orders").click();
  await expect(page.getByText("100,000")).toBeVisible({ timeout: 5 * 1000 });
});
