import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type AdminPaginationProps = {
  basePath: string;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  query?: Record<string, string | undefined>;
};

function pageHref(basePath: string, page: number, query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

export function AdminPagination({ basePath, page, totalPages, totalItems, pageSize, query }: AdminPaginationProps) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
      <span>
        显示 {start}-{end} / {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <Link
          to={page > 1 ? pageHref(basePath, page - 1, query) : pageHref(basePath, page, query)}
          aria-disabled={page <= 1}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-50")}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          上一页
        </Link>
        <span className="min-w-20 text-center tabular-nums text-[var(--muted-strong)]">
          {page} / {totalPages}
        </span>
        <Link
          to={page < totalPages ? pageHref(basePath, page + 1, query) : pageHref(basePath, page, query)}
          aria-disabled={page >= totalPages}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), page >= totalPages && "pointer-events-none opacity-50")}
        >
          下一页
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
