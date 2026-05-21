import { expect, test, type Page } from "@playwright/test";

async function loginAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("账号").fill("admin");
  await page.getByLabel("密码").fill("test1234567890");
  await page.getByRole("button", { name: /进入控制台/ }).click();
  await page.waitForURL("**/admin");
  await expect(page.getByLabel("管理员账号")).toBeVisible();
}

const adminPages = [
  { path: "/admin", name: "dashboard" },
  { path: "/admin/goods", name: "goods" },
  { path: "/admin/cards", name: "cards" },
  { path: "/admin/logs", name: "logs" },
  { path: "/admin/settings", name: "settings" },
];

test("admin pages render and produce smoke screenshots", async ({ page }, testInfo) => {
  await loginAdmin(page);

  for (const adminPage of adminPages) {
    await page.goto(adminPage.path);
    await expect(page.getByLabel("管理员账号")).toBeVisible();
    await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath(`admin-${adminPage.name}.png`),
    });
  }
});
