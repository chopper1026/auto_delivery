"use client";

import { useActionState } from "react";
import { Check, Save } from "lucide-react";
import { updateSystemSettingsAction, type UpdateSystemSettingsState } from "@/app/admin/(protected)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: UpdateSystemSettingsState = {};

export function SettingsForm({ csrfToken, serviceBaseUrl }: { csrfToken: string; serviceBaseUrl: string }) {
  const [state, formAction, pending] = useActionState(updateSystemSettingsAction, initialState);
  const displayedServiceBaseUrl = state.serviceBaseUrl ?? serviceBaseUrl;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <div className="space-y-2">
        <Label htmlFor="serviceBaseUrl">服务地址</Label>
        <Input
          key={displayedServiceBaseUrl}
          id="serviceBaseUrl"
          name="serviceBaseUrl"
          type="url"
          required
          defaultValue={displayedServiceBaseUrl}
          placeholder="https://example.com"
        />
        <p className="text-sm leading-6 text-[var(--muted)]">生成卡密后，复制给客户的兑换地址会使用这里的服务地址。</p>
      </div>

      {state.error ? (
        <p className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="flex items-center gap-2 rounded-lg border border-[var(--success-line)] bg-[var(--success-soft)] px-3 py-2 text-sm text-[var(--success-ink)]">
          <Check className="h-4 w-4" aria-hidden="true" />
          已保存服务地址
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {pending ? "保存中" : "保存设置"}
        </Button>
      </div>
    </form>
  );
}
