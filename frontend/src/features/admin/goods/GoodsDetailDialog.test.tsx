import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GoodsDetailDialog } from "./GoodsDetailDialog";

describe("GoodsDetailDialog", () => {
  it("submits edited text goods details", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <GoodsDetailDialog
        open
        onOpenChange={vi.fn()}
        goodsName="旧文本货物"
        goodsType="TEXT"
        goodsNote="旧备注"
        textContent="旧文本内容"
        pending={false}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "编辑货物" }));
    expect(Array.from(document.querySelectorAll("form label")).map((label) => label.textContent)).toEqual(["名称", "文本内容", "备注"]);
    await user.clear(screen.getByLabelText("名称"));
    await user.type(screen.getByLabelText("名称"), "新文本货物");
    await user.clear(screen.getByLabelText("文本内容"));
    await user.type(screen.getByLabelText("文本内容"), "新文本内容");
    await user.clear(screen.getByLabelText("备注"));
    await user.type(screen.getByLabelText("备注"), "新备注");
    await user.click(screen.getByRole("button", { name: "保存详情" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "新文本货物",
      note: "新备注",
      textContent: "新文本内容",
    });
  });
});
