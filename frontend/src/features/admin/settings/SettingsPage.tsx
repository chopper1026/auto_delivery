import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { SettingsForm } from "./SettingsForm";

export function SettingsPage() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <h3 className="font-semibold text-[var(--ink)]">偏好设置</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">用于生成卡密后的客户文案和兑换地址。</p>
        </div>
        <div className="max-w-3xl p-4">
          {settings.isLoading ? <p className="text-sm text-[var(--muted)]">读取设置中</p> : null}
          {settings.isError ? <p className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{settings.error.message}</p> : null}
          {settings.data ? (
            <SettingsForm serviceBaseUrl={settings.data.serviceBaseUrl} cardKeyDeliveryMessageTemplate={settings.data.deliveryMessageTemplate} />
          ) : null}
        </div>
      </section>
    </div>
  );
}
