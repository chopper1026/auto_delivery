import { CheckCircle2, Download } from "lucide-react";
import { buttonVariants, Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DownloadButton({ token, disabled }: { token: string; disabled?: boolean }) {
  if (disabled) {
    return (
      <Button disabled size="lg" className="w-full sm:w-auto">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        已下载
      </Button>
    );
  }

  return (
    <a className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")} href={`/api/download/${encodeURIComponent(token)}`}>
      <Download className="h-4 w-4" aria-hidden="true" />
      下载 ZIP
    </a>
  );
}
