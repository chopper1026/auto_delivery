import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyText } from "./cardKeyClipboard";

function ResultCopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const didCopy = await copyText(text);
    if (!didCopy) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <Button type="button" variant="ghost" size="icon" onClick={handleCopy} aria-label={label} className="h-8 w-8 shrink-0 rounded-md text-[var(--muted-strong)]">
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
    </Button>
  );
}

export function GeneratedCardKeyResult({
  plaintextKey,
  keyMask,
  deliveryMessage,
}: {
  plaintextKey: string;
  keyMask?: string;
  deliveryMessage?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--primary)]/20 bg-[var(--primary-soft)] p-4">
      <p className="text-sm font-medium text-[var(--primary)]">完整卡密只显示一次</p>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)]">
        <section className="min-w-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-2">
            <h4 className="text-sm font-semibold text-[var(--ink)]">纯卡密</h4>
            <ResultCopyButton text={plaintextKey} label="复制纯卡密" />
          </div>
          <code className="block min-h-20 break-all px-3 py-3 font-mono text-base font-semibold leading-7 text-[var(--ink)]">{plaintextKey}</code>
          {keyMask ? <p className="border-t border-[var(--line)] px-3 py-2 font-mono text-xs text-[var(--muted-strong)]">掩码：{keyMask}</p> : null}
        </section>
        {deliveryMessage ? (
          <section className="min-w-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-2">
              <h4 className="text-sm font-semibold text-[var(--ink)]">客户文案</h4>
              <ResultCopyButton text={deliveryMessage} label="复制客户文案" />
            </div>
            <pre className="max-h-60 min-h-20 overflow-auto whitespace-pre-wrap break-words px-3 py-3 text-sm leading-6 text-[var(--ink)]">{deliveryMessage}</pre>
          </section>
        ) : null}
      </div>
    </div>
  );
}
