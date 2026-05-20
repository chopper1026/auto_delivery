import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Select } from "./select";

describe("Select", () => {
  it("renders the selected option and updates the hidden form value", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Select name="status" defaultValue="ACTIVE">
        <option value="ACTIVE">启用</option>
        <option value="DISABLED">停用</option>
      </Select>,
    );

    expect(screen.getByRole("button").textContent).toContain("启用");
    expect(container.querySelector<HTMLInputElement>('input[name="status"]')?.value).toBe("ACTIVE");

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("option", { name: "停用" }));

    expect(screen.getByRole("button").textContent).toContain("停用");
    expect(container.querySelector<HTMLInputElement>('input[name="status"]')?.value).toBe("DISABLED");
  });
});
