import { test, expect } from "@playwright/test";

test.describe("Malloy editor mode", () => {
  test("Custom malloy query opens in editor mode and shows results", async ({
    page,
  }) => {
    // A query with a custom aggregate expression can't be represented as a
    // structured explorer query, so it falls back to editor mode
    const customQuery =
      "run: invoices -> { group_by: status; aggregate: double_count is count() * 2 }";

    await page.goto(
      `./#/model/invoices/explorer/invoices?query=${encodeURIComponent(customQuery)}&run=true`,
    );

    // Wait for loader to disappear
    await page
      .getByTestId("loader")
      .waitFor({ state: "hidden", timeout: 15000 })
      .catch(() => {});

    // Expand the query panel by clicking the filter sliders icon
    await page
      .getByTestId("icon-primary-filterSliders")
      .locator(":visible")
      .click();

    // Assert editor mode is active: "Malloy Editor" heading is visible in the query panel
    await expect(page.getByText("Malloy Editor")).toBeVisible({
      timeout: 15000,
    });

    // Assert the query results are shown
    await expect(
      page.getByRole("tab", { name: "Results", selected: true }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("Parseable malloy query opens in visual query editor mode", async ({
    page,
  }) => {
    // A query in stable format IS parseable by malloyToQuery
    // and should show the visual query editor
    await page.goto(
      "./#/model/invoices/explorer/invoices?query=run:invoices->by_status&run=true",
    );

    // Wait for loader to disappear
    await page
      .getByTestId("loader")
      .waitFor({ state: "hidden", timeout: 15000 })
      .catch(() => {});

    // Expand the query panel
    await page
      .getByTestId("icon-primary-filterSliders")
      .locator(":visible")
      .click();

    // The visual query editor should be shown, NOT the Malloy Editor
    await expect(page.getByText("Main query")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Malloy Editor")).not.toBeVisible();

    // Results should be shown
    await expect(
      page.getByRole("tab", { name: "Results", selected: true }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("Custom query is preserved in the URL", async ({ page }) => {
    const customQuery =
      "run: invoices -> { group_by: status; aggregate: double_count is count() * 2 }";

    await page.goto(
      `./#/model/invoices/explorer/invoices?query=${encodeURIComponent(customQuery)}&run=true`,
    );

    // Wait for loader to disappear
    await page
      .getByTestId("loader")
      .waitFor({ state: "hidden", timeout: 15000 })
      .catch(() => {});

    // Verify the query is preserved in the URL
    const url = page.url();
    expect(url).toContain("query=");
    expect(decodeURIComponent(url)).toContain(
      "run: invoices -> { group_by: status; aggregate: double_count is count() * 2 }",
    );
  });

  test("Running from editor mode preserves editor mode", async ({ page }) => {
    // Start with a parseable query in visual mode
    await page.goto(
      "./#/model/invoices/explorer/invoices?query=run:invoices->by_status&run=true",
    );

    await page
      .getByTestId("loader")
      .waitFor({ state: "hidden", timeout: 15000 })
      .catch(() => {});

    // Expand the query panel
    await page
      .getByTestId("icon-primary-filterSliders")
      .locator(":visible")
      .click();

    await expect(page.getByText("Main query")).toBeVisible({ timeout: 15000 });

    // Convert to Malloy editor
    await page
      .getByTestId("icon-primary-meatballs")
      .locator(":visible")
      .first()
      .click();
    await page.getByText("Convert to Malloy").click();

    await expect(page.getByText("Malloy Editor")).toBeVisible({
      timeout: 15000,
    });

    // Wait for Monaco to load
    await expect(page.locator(".monaco-editor").first()).toBeVisible({
      timeout: 30000,
    });

    // Run the query from editor mode
    await page.getByRole("button", { name: "Run" }).click();

    // Wait for query to complete
    await page
      .getByTestId("loader")
      .waitFor({ state: "hidden", timeout: 15000 })
      .catch(() => {});

    // Should still be in editor mode after running
    await expect(page.getByText("Malloy Editor")).toBeVisible({
      timeout: 5000,
    });

    // URL should contain mode=code
    expect(page.url()).toContain("mode=code");

    // Should NOT show the "Query was updated" warning
    await expect(page.getByText("Query was updated")).not.toBeVisible();
  });

  test("mode=code forces editor mode even for simple parseable queries", async ({
    page,
  }) => {
    // A simple view query that would normally open in the structured builder,
    // but mode=code forces it into the code editor
    await page.goto(
      "./#/model/invoices/explorer/invoices?query=run:invoices->by_status&run=true&mode=code",
    );

    await page
      .getByTestId("loader")
      .waitFor({ state: "hidden", timeout: 15000 })
      .catch(() => {});

    // Expand the query panel
    await page
      .getByTestId("icon-primary-filterSliders")
      .locator(":visible")
      .click();

    // Should be in editor mode, NOT the visual query builder
    await expect(page.getByText("Malloy Editor")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Main query")).not.toBeVisible();

    // Results should still be shown
    await expect(
      page.getByRole("tab", { name: "Results", selected: true }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("Convert to Malloy editor and back to visual editor", async ({
    page,
  }) => {
    // Start with a parseable query in visual mode (stable format)
    await page.goto(
      "./#/model/invoices/explorer/invoices?query=run:invoices->by_status&run=true",
    );

    // Wait for visual editor to be ready
    await page
      .getByTestId("loader")
      .waitFor({ state: "hidden", timeout: 15000 })
      .catch(() => {});

    // Expand the query panel
    await page
      .getByTestId("icon-primary-filterSliders")
      .locator(":visible")
      .click();

    await expect(page.getByText("Main query")).toBeVisible({ timeout: 15000 });

    // Click the three-dot menu (meatballs icon) on the "Main query" section
    await page
      .getByTestId("icon-primary-meatballs")
      .locator(":visible")
      .first()
      .click();
    await page.getByText("Convert to Malloy").click();

    // Should now be in editor mode
    await expect(page.getByText("Malloy Editor")).toBeVisible({
      timeout: 15000,
    });

    // Wait for Monaco editor to initialize (lazy-loaded)
    await expect(page.locator(".monaco-editor").first()).toBeVisible({
      timeout: 30000,
    });

    // Wait for Monaco diagnostics to complete so "Use Query Editor" becomes enabled
    await page.waitForTimeout(3000);

    // Switch back: click the three-dot menu in editor mode → "Use Query Editor"
    await page
      .getByTestId("icon-primary-meatballs")
      .locator(":visible")
      .first()
      .click();
    await page.getByText("Use Query Editor").click();

    // Should be back in visual mode
    await expect(page.getByText("Main query")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Malloy Editor")).not.toBeVisible();
  });
});
