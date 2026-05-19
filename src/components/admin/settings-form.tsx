"use client";

import { useActionState } from "react";
import { Check, Save } from "lucide-react";
import { updateSystemSettingsAction, type UpdateSystemSettingsState } from "@/app/admin/(protected)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: UpdateSystemSettingsState = {};

export function SettingsForm({
  csrfToken,
  serviceBaseUrl,
  cardKeyDeliveryMessageTemplate,
}: {
  csrfToken: string;
  serviceBaseUrl: string;
  cardKeyDeliveryMessageTemplate: string;
}) {
  const [state, formAction, pending] = useActionState(updateSystemSettingsAction, initialState);
  const displayedServiceBaseUrl = state.serviceBaseUrl ?? serviceBaseUrl;
  const displayedCardKeyDeliveryMessageTemplate = state.cardKeyDeliveryMessageTemplate ?? cardKeyDeliveryMessageTemplate;

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

      <div className="space-y-2">
        <Label htmlFor="cardKeyDeliveryMessageTemplate">客户文案模板</Label>
        <Textarea
          key={displayedCardKeyDeliveryMessageTemplate}
          id="cardKeyDeliveryMessageTemplate"
          name="cardKeyDeliveryMessageTemplate"
          defaultValue={displayedCardKeyDeliveryMessageTemplate}
          className="min-h-64 font-mono text-sm leading-6"
        />
        <p className="text-sm leading-6 text-[var(--muted)]">
          支持变量：{"{{redeemUrl}}"}、{"{{cardKey}}"}、{"{{createdAt}}"}、{"{{expiresAt}}"}。留空会恢复默认文案。
        </p>
      </div>

      {state.error ? (
        <p className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="flex items-center gap-2 rounded-lg border border-[var(--success-line)] bg-[var(--success-soft)] px-3 py-2 text-sm text-[var(--success-ink)]">
          <Check className="h-4 w-4" aria-hidden="true" />
          已保存偏好设置
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
