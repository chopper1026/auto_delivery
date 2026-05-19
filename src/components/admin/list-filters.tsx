import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type StatusOption = {
  value: string;
  label: string;
};

export function AdminListFilters({
  action,
  query,
  status,
  searchPlaceholder,
  statusOptions,
  resetHref,
  className,
}: {
  action: string;
  query: string;
  status: string;
  searchPlaceholder: string;
  statusOptions: StatusOption[];
  resetHref: string;
  className?: string;
}) {
  const hasFilters = query.length > 0 || status.length > 0;

  return (
    <form action={action} method="get" className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
        <Input name="q" defaultValue={query} placeholder={searchPlaceholder} className="pl-9" />
      </div>
      <Select name="status" defaultValue={status} className="sm:w-36">
        <option value="">全部状态</option>
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="outline" className="sm:w-20">
        筛选
      </Button>
      {hasFilters ? (
        <Link href={resetHref} className={cn(buttonVariants({ variant: "ghost" }), "sm:w-20")}>
          <X className="h-4 w-4" aria-hidden="true" />
          重置
        </Link>
      ) : null}
    </form>
  );
}
