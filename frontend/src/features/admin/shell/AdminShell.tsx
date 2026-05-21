import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { adminApi } from "@/api/admin";
import { clearCsrfToken, setCsrfToken } from "@/api/client";
import { queryKeys } from "@/api/queryKeys";
import { AdminNav } from "./AdminNav";
import { getAdminPageTitle } from "./adminNavigation";
import { Centered } from "@/components/Centered";
import { useEffect } from "react";

export function AdminShell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useQuery({ queryKey: queryKeys.session, queryFn: adminApi.session });
  const pageTitle = getAdminPageTitle(location.pathname);
  const logout = useMutation({
    mutationFn: adminApi.logout,
    onSettled: () => {
      clearCsrfToken();
      queryClient.clear();
      navigate("/admin/login", { replace: true });
    },
  });

  useEffect(() => {
    if (session.data?.csrfToken) setCsrfToken(session.data.csrfToken);
  }, [session.data?.csrfToken]);

  if (session.isLoading) return <Centered message="验证登录状态" />;
  if (session.error) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <AdminNav onLogout={() => logout.mutate()} logoutPending={logout.isPending} />
      <main className="min-w-0 px-4 py-5 sm:px-6 lg:ml-64 lg:px-8 lg:py-6">
        <header aria-label="管理顶栏" className="mb-5 flex flex-col gap-3 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">{pageTitle}</h1>
          </div>
          <div aria-label="管理员账号" className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 shadow-[var(--shadow)]">
            <span data-testid="default-admin-avatar" className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
              <UserRound className="h-4 w-4" aria-hidden="true" />
            </span>
            <strong className="pr-1 text-sm font-semibold text-[var(--ink)]">{session.data?.admin.username}</strong>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
