import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, LogOut } from "lucide-react";
import { Link, Navigate, Outlet, useNavigate } from "react-router-dom";
import { api, clearCsrfToken, setCsrfToken } from "../../api";
import { AdminNav } from "../../components/admin/AdminNav";
import { Centered } from "../../components/Centered";
import { Button } from "../../components/ui/button";
import { useEffect } from "react";

export function AdminShell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const session = useQuery({ queryKey: ["session"], queryFn: api.session });
  const logout = useMutation({
    mutationFn: api.logout,
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
      <AdminNav />
      <main className="min-w-0 px-4 py-5 sm:px-6 lg:ml-64 lg:px-8 lg:py-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)]">当前管理员</p>
            <strong className="mt-1 block text-sm text-[var(--ink)]">{session.data?.admin.username}</strong>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="secondary" to="/">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              打开兑换页
            </Link>
            <Button type="button" variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {logout.isPending ? "退出中" : "退出登录"}
            </Button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
