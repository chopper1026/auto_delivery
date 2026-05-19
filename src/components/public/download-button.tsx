import { CheckCircle2, Download } from "lucide-react";
import { buttonVariants, Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DownloadButton({ token, disabled, className }: { token: string; disabled?: boolean; className?: string }) {
  if (disabled) {
    return (
      <Button disabled size="lg" className={cn("w-full sm:w-auto", className)}>
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        已下载
      </Button>
    );
  }

  return (
    <a className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto", className)} href={`/api/download/${encodeURIComponent(token)}`}>
      <Download className="h-4 w-4" aria-hidden="true" />
      下载 ZIP
    </a>
  );
}
