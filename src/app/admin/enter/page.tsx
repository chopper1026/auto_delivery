import { AdminEnterTransition } from "@/components/admin/admin-enter-transition";
import { requireAdminSession } from "@/lib/admin/auth";

const REDIRECT_DELAY_SECONDS = 1.4;

export default async function AdminEnterPage() {
  await requireAdminSession();

  return (
    <>
      <meta httpEquiv="refresh" content={`${REDIRECT_DELAY_SECONDS};url=/admin`} />
      <AdminEnterTransition />
    </>
  );
}
