import { buttonVariants, Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DownloadButton({ token, disabled }: { token: string; disabled?: boolean }) {
  if (disabled) {
    return (
      <Button disabled size="lg">
        已下载
      </Button>
    );
  }

  return (
    <a className={cn(buttonVariants({ size: "lg" }))} href={`/api/download/${encodeURIComponent(token)}`}>
      下载 ZIP
    </a>
  );
}
