import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AdminListFilters } from "./ListFilters";

describe("AdminListFilters", () => {
  it("uses an explicit icon input class so the search icon does not overlap the placeholder", () => {
    render(
      <MemoryRouter>
        <AdminListFilters
          action="/admin/goods"
          query=""
          status=""
          searchPlaceholder="搜索货物名称"
          statusOptions={[{ value: "ACTIVE", label: "启用" }]}
          resetHref="/admin/goods"
        />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText("搜索货物名称").className.split(/\s+/)).toContain("admin-filter-search-input");
  });
});
