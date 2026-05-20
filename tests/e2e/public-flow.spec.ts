import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function loginAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("账号").fill("admin");
  await page.getByLabel("密码").fill("test1234567890");
  await page.getByRole("button", { name: /进入控制台/ }).click();
  await page.waitForURL("**/admin");
  await expect(page.getByText("当前管理员")).toBeVisible();
}

async function openGoodsPicker(page: Page, goodsName: string) {
  await page.locator('button[aria-haspopup="dialog"]').click();
  await page.getByPlaceholder("搜索货物名称或备注").fill(goodsName);
  await page.locator('[role="dialog"]').getByRole("button", { name: new RegExp(goodsName) }).click();
  await expect(page.locator('button[aria-haspopup="dialog"]')).toContainText(goodsName);
}

async function generateCardKey(page: Page, goodsName: string, fileQuantity?: number) {
  await page.goto("/admin/cards");
  await openGoodsPicker(page, goodsName);
  if (fileQuantity) {
    await page.getByLabel("文件数量").fill(String(fileQuantity));
  }
  await page.getByRole("button", { name: "生成" }).click();
  await expect(page.getByText("完整卡密只显示一次")).toBeVisible();
  return (await page.locator("code").innerText()).trim();
}

async function redeemCardKey(page: Page, cardKey: string) {
  await page.goto("/");
  await page.getByLabel("卡密").fill(cardKey);
  await page.getByRole("button", { name: /确认兑换/ }).click();
  await page.waitForURL("**/receipt/**");
}

test("text goods can be generated, redeemed, and viewed on the receipt page", async ({ page }) => {
  const suffix = Date.now();
  const goodsName = `E2E 文本货物 ${suffix}`;
  const textContent = `账号：demo-${suffix}\n密码：secret-${suffix}`;

  await loginAdmin(page);
  await page.goto("/admin/goods");
  await page.getByRole("button", { name: "新增货物" }).click();
  await page.getByLabel("名称").fill(goodsName);
  await page.getByLabel("内容").fill(textContent);
  await page.getByRole("button", { name: "添加文本货物" }).click();
  await expect(page.getByText(goodsName)).toBeVisible();

  const cardKey = await generateCardKey(page, goodsName);
  await redeemCardKey(page, cardKey);
  await expect(page.getByText(goodsName)).toBeVisible();
  await expect(page.getByText(textContent)).toBeVisible();
});

test("file goods can be redeemed, downloaded once, and redirected on repeat download", async ({ page }) => {
  const suffix = Date.now();
  const goodsName = `E2E 文件货物 ${suffix}`;

  await loginAdmin(page);
  await page.goto("/admin/goods");
  await page.getByRole("button", { name: "新增货物" }).click();
  await page.getByRole("button", { name: "文件" }).click();
  await page.getByLabel("名称").fill(goodsName);
  await page.getByLabel("备注").fill("E2E 文件备注");
  await page.getByRole("button", { name: "创建文件货物" }).click();
  await expect(page.getByText(goodsName)).toBeVisible();

  const row = page.locator("tr").filter({ hasText: goodsName });
  await row.getByRole("button", { name: "上传" }).click();
  await page.locator('input[type="file"]').setInputFiles([
    {
      name: "first.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ account: `first-${suffix}` })),
    },
    {
      name: "second.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ account: `second-${suffix}` })),
    },
  ]);
  await page.getByRole("button", { name: "上传文件" }).click();
  await expect(row).toContainText("可用 2");

  const cardKey = await generateCardKey(page, goodsName, 2);
  await redeemCardKey(page, cardKey);
  await expect(page.getByText(goodsName)).toBeVisible();

  const receiptToken = new URL(page.url()).pathname.split("/").pop();
  if (!receiptToken) throw new Error("receipt token missing from URL");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "下载 ZIP" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain(".zip");

  await page.goto(`/api/download/${receiptToken}`);
  await page.waitForURL("**/download/already-downloaded**");
  await expect(page.getByText("文件已下载过")).toBeVisible();
});
