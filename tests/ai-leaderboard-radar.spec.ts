import { expect, test } from "@playwright/test";
import { companies } from "../lib/companies";

const medvi = companies.find((company) => company.id === "medvi") || companies[0];

test.describe("AI Leaderboard Radar catalog", () => {
  test("skill setup is first-screen and catalog links open company websites", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("AI Leaderboard Radar");
    await expect(page.getByRole("heading", { name: "AI Leaderboard Radar", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Use it in Codex.", level: 2 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Unlock install command" })).toBeVisible();
    await expect(page.getByText("npx skills add georgewangyu/ai-leaderboard-radar")).toBeHidden();
    await expect(page.getByText(`${companies.length} matching companies`)).toBeVisible();

    await page.getByPlaceholder("Company, market, source...").fill(medvi.company);
    await expect(page.getByText("1 matching companies")).toBeVisible();
    const companyLink = page.getByRole("link", { name: medvi.company });
    await expect(companyLink).toHaveAttribute("href", medvi.website);
    await expect(companyLink).toHaveAttribute("target", "_blank");
  });

  test("filters and sort modes update the leaderboard", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("Sort").selectOption("team-size");
    await expect(page.getByLabel("Sort")).toHaveValue("team-size");

    await page.getByLabel("Source type").selectOption("public");
    await expect(page.getByText(/matching companies/)).toBeVisible();
    const sourceLabels = await page.locator(".source-pill").allTextContents();
    expect(sourceLabels.length).toBeGreaterThan(0);
    expect(sourceLabels.every((label) => label === "Public source")).toBe(true);
  });

  test("lead unlock reveals and copies the setup command", async ({ page, context }) => {
    const payloads: Array<Record<string, unknown>> = [];

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.route("**/api/leads", async (route) => {
      payloads.push(JSON.parse(route.request().postData() || "{}") as Record<string, unknown>);
      await route.fulfill({
        body: JSON.stringify({ ok: true }),
        contentType: "application/json",
        status: 200,
      });
    });
    await page.goto("/");

    await page.getByLabel("Name").fill("Example User");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("person@example.com");
    await page.getByRole("button", { name: "Unlock install command" }).click();
    await expect(page.getByRole("link", { name: "Star the repo" })).toHaveAttribute(
      "href",
      "https://github.com/georgewangyu/ai-leaderboard-radar",
    );
    await page.getByRole("button", { name: "Copy command" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();

    const command = await page.evaluate(() => navigator.clipboard.readText());
    expect(command).toBe("npx skills add georgewangyu/ai-leaderboard-radar --skill ai-leaderboard-radar -g");
    expect(payloads[0]).toMatchObject({ name: "Example User", email: "person@example.com" });
  });

  test("submit form posts a leaderboard update", async ({ page }) => {
    const payloads: Array<Record<string, unknown>> = [];

    await page.route("**/api/submit", async (route) => {
      payloads.push(JSON.parse(route.request().postData() || "{}") as Record<string, unknown>);
      await route.fulfill({
        body: JSON.stringify({
          issueNumber: 42,
          issueUrl: "https://github.com/example/repo/issues/42",
          ok: true,
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    await page.goto("/");
    await page.getByLabel("Company").fill("Example AI");
    await page.getByLabel("What changed?").fill("Example AI crossed a reported revenue threshold.");
    await page.getByLabel("Source or context").fill("https://example.com/source");
    await page.getByRole("button", { name: "Create issue" }).click();

    await expect(page.getByText("Submission sent.")).toBeVisible();
    expect(payloads[0]?.submissionType).toBe("submit-company");
    expect(payloads[0]?.title).toBe("Example AI");
  });

  test("mobile layout has no horizontal overflow", async ({ page }) => {
    await page.goto("/");

    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
  });
});
