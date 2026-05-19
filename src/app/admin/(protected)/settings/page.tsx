import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdminSession } from "@/lib/admin/auth";
import { rotateCsrfToken } from "@/lib/security/csrf";
import { getCardKeyDeliveryMessageTemplate, getServiceBaseUrl } from "@/lib/settings/service";

export default async function AdminSettingsPage() {
  const { token } = await requireAdminSession();
  const csrfToken = await rotateCsrfToken(token);
  const [serviceBaseUrl, cardKeyDeliveryMessageTemplate] = await Promise.all([
    getServiceBaseUrl(),
    getCardKeyDeliveryMessageTemplate(),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ink)]">系统设置</h2>
        </div>
      </header>

      <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <h3 className="font-semibold text-[var(--ink)]">偏好设置</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">用于生成卡密后的客户文案和兑换地址。</p>
        </div>
        <div className="max-w-3xl p-4">
          <SettingsForm
            csrfToken={csrfToken}
            serviceBaseUrl={serviceBaseUrl}
            cardKeyDeliveryMessageTemplate={cardKeyDeliveryMessageTemplate}
          />
        </div>
      </section>
    </div>
  );
}
