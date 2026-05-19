"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getReceiptReturnDialog, type ReceiptReturnDialog, type ReceiptReturnState } from "@/lib/receipt-return";
import { cn } from "@/lib/utils";

type ReceiptReturnButtonProps =
  | { kind: "TEXT"; className?: string }
  | { kind: "FILE"; token: string; downloaded: boolean; className?: string };

export function ReceiptReturnButton({ className, ...receipt }: ReceiptReturnButtonProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [confirmation, setConfirmation] = useState<ReceiptReturnDialog | null>(null);

  async function getCurrentReceiptState(): Promise<ReceiptReturnState> {
    if (receipt.kind === "TEXT") return { kind: "TEXT" };

    try {
      const response = await fetch(`/api/receipt/${encodeURIComponent(receipt.token)}`, { cache: "no-store" });
      if (!response.ok) return { kind: "FILE", downloaded: receipt.downloaded };
      const data = (await response.json()) as { kind?: string; downloaded?: boolean };
      return { kind: "FILE", downloaded: data.kind === "FILE" ? Boolean(data.downloaded) : receipt.downloaded };
    } catch {
      return { kind: "FILE", downloaded: receipt.downloaded };
    }
  }

  async function handleReturn() {
    setChecking(true);
    const currentReceipt = await getCurrentReceiptState();
    setChecking(false);
    const nextConfirmation = getReceiptReturnDialog(currentReceipt);
    if (nextConfirmation) {
      setConfirmation(nextConfirmation);
      return;
    }

    router.push("/");
  }

  function confirmReturn() {
    setConfirmation(null);
    router.push("/");
  }

  return (
    <>
      <Button type="button" variant="outline" size="lg" onClick={handleReturn} disabled={checking} className={cn("w-full sm:w-auto", className)}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {checking ? "校验中" : "返回兑换页"}
      </Button>
      {confirmation ? (
        <ConfirmDialog
          open
          title={confirmation.title}
          description={confirmation.description}
          confirmLabel={confirmation.confirmLabel}
          cancelLabel={confirmation.cancelLabel}
          tone={confirmation.tone}
          onCancel={() => setConfirmation(null)}
          onConfirm={confirmReturn}
        />
      ) : null}
    </>
  );
}
