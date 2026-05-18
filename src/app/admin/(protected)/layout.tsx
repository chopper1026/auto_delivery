import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminSession } from "@/lib/admin/auth";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <AdminNav />
      <main className="min-w-0 px-4 py-5 sm:px-6 lg:ml-64 lg:px-8 lg:py-6">{children}</main>
    </div>
  );
}
