import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Save } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "@/api";
import type { Settings } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SettingsForm({
  serviceBaseUrl,
  cardKeyDeliveryMessageTemplate,
}: {
  serviceBaseUrl: string;
  cardKeyDeliveryMessageTemplate: string;
}) {
  const queryClient = useQueryClient();
  const [serviceUrl, setServiceUrl] = useState(serviceBaseUrl);
  const [template, setTemplate] = useState(cardKeyDeliveryMessageTemplate);
  const [saved, setSaved] = useState(false);
  const update = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: (value: Settings) => {
      queryClient.setQueryData(["settings"], value);
      setServiceUrl(value.serviceBaseUrl);
      setTemplate(value.deliveryMessageTemplate);
      setSaved(true);
    },
    onError: () => setSaved(false),
  });

  useEffect(() => {
    setServiceUrl(serviceBaseUrl);
    setTemplate(cardKeyDeliveryMessageTemplate);
  }, [cardKeyDeliveryMessageTemplate, serviceBaseUrl]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    update.mutate({
      serviceBaseUrl: serviceUrl,
      deliveryMessageTemplate: template,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="serviceBaseUrl">服务地址</Label>
        <Input
          id="serviceBaseUrl"
          name="serviceBaseUrl"
          type="url"
          required
          value={serviceUrl}
          onChange={(event) => setServiceUrl(event.target.value)}
          placeholder="https://example.com"
        />
        <p className="text-sm leading-6 text-[var(--muted)]">生成卡密后，复制给客户的兑换地址会使用这里的服务地址。</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardKeyDeliveryMessageTemplate">客户文案模板</Label>
        <Textarea
          id="cardKeyDeliveryMessageTemplate"
          name="cardKeyDeliveryMessageTemplate"
          value={template}
          onChange={(event) => setTemplate(event.target.value)}
          className="min-h-64 font-mono text-sm leading-6"
        />
        <p className="text-sm leading-6 text-[var(--muted)]">
          支持变量：{"{{redeemUrl}}"}、{"{{cardKey}}"}、{"{{createdAt}}"}、{"{{expiresAt}}"}。留空会恢复默认文案。
        </p>
      </div>

      {update.error ? <p className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{update.error.message}</p> : null}
      {saved ? (
        <p className="flex items-center gap-2 rounded-lg border border-[var(--success-line)] bg-[var(--success-soft)] px-3 py-2 text-sm text-[var(--success-ink)]">
          <Check className="h-4 w-4" aria-hidden="true" />
          已保存偏好设置
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={update.isPending}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {update.isPending ? "保存中" : "保存设置"}
        </Button>
      </div>
    </form>
  );
}
