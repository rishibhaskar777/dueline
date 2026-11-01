import { expect, test } from "@playwright/test";

test.describe("Profile", () => {
  test("a GSTIN in the wrong format shows an inline error and blocks saving", async ({ page }) => {
    await page.goto("/profile");
    const gstin = page.getByLabel("GSTIN");
    await expect(gstin).not.toHaveValue("");

    await gstin.fill("NOT-A-GSTIN");
    await gstin.blur();

    await expect(gstin).toHaveAttribute("aria-invalid", "true");
    const error = page.locator("#profile-gstin-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText("must be 15 characters");

    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved")).toHaveCount(0);
  });
});
