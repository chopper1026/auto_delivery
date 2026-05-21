import { Search, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { buttonVariants, Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select } from "../ui/select";

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
  const navigate = useNavigate();
  const [queryValue, setQueryValue] = useState(query);
  const [statusValue, setStatusValue] = useState(status);
  const hasFilters = queryValue.length > 0 || statusValue.length > 0;

  useEffect(() => {
    setQueryValue(query);
    setStatusValue(status);
  }, [query, status]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    const nextQuery = queryValue.trim();
    if (nextQuery) params.set("q", nextQuery);
    if (statusValue) params.set("status", statusValue);
    const search = params.toString();
    navigate(search ? `${action}?${search}` : action);
  }

  return (
    <form onSubmit={submit} className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
        <Input
          name="q"
          value={queryValue}
          onChange={(event) => setQueryValue(event.target.value)}
          placeholder={searchPlaceholder}
          className="admin-filter-search-input"
        />
      </div>
      <Select name="status" value={statusValue} onValueChange={setStatusValue} className="sm:w-36">
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
        <Link to={resetHref} className={cn(buttonVariants({ variant: "ghost" }), "sm:w-20")}>
          <X className="h-4 w-4" aria-hidden="true" />
          重置
        </Link>
      ) : null}
    </form>
  );
}
