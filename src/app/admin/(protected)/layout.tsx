import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminSession } from "@/lib/admin/auth";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession();

  return (
    <div className="min-h-screen bg-[var(--surface)] text-white md:flex">
      <AdminNav />
      <main className="min-w-0 flex-1 px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
