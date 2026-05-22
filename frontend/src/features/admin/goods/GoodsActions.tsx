import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CirclePlay, Info, PauseCircle, Trash2, Upload } from "lucide-react";
import { adminApi } from "@/api/admin";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { GoodsDeleteDialog } from "./GoodsDeleteDialog";
import { GoodsDetailDialog } from "./GoodsDetailDialog";
import { GoodsExportMenu } from "./GoodsExportMenu";
import { GoodsUploadDialog } from "./GoodsUploadDialog";
import { useState } from "react";
import type { UpdateGoodsInput } from "@/types/shared";

type InventoryCounts = {
  available: number;
  reserved: number;
  redeemed: number;
};

type UsageCounts = {
  cardKeys: number;
  redemptions: number;
};

export function GoodsActions({
  goodsId,
  goodsName,
  goodsType,
  goodsNote,
  textContent,
  inventory,
  usage,
  status,
}: {
  goodsId: string;
  goodsName: string;
  goodsType: "TEXT" | "FILE";
  goodsNote?: string | null;
  textContent?: string | null;
  inventory: InventoryCounts;
  usage: UsageCounts;
  status: "ACTIVE" | "DISABLED";
}) {
  const queryClient = useQueryClient();
  const [detailOpen, setDetailOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isFileGoods = goodsType === "FILE";
  const unredeemedCount = inventory.available + inventory.reserved;
  const redeemedCount = inventory.redeemed;
  const canDelete = usage.cardKeys === 0 && usage.redemptions === 0;

  const toggleStatus = useMutation({
    mutationFn: (nextStatus: "ACTIVE" | "DISABLED") => adminApi.updateGoods(goodsId, { status: nextStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.goodsRoot }),
  });
  const updateDetails = useMutation({
    mutationFn: (input: UpdateGoodsInput) => adminApi.updateGoods(goodsId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goodsRoot });
      setDetailOpen(false);
    },
  });
  const uploadFiles = useMutation({
    mutationFn: (files: FileList) => adminApi.uploadFiles(goodsId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goodsRoot });
      setUploadOpen(false);
    },
  });
  const deleteGoods = useMutation({
    mutationFn: () => adminApi.deleteGoods(goodsId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goodsRoot });
      setDeleteOpen(false);
    },
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setDetailOpen(true)}>
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          详情
        </Button>

        {isFileGoods ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              上传
            </Button>
            <GoodsExportMenu goodsId={goodsId} unredeemedCount={unredeemedCount} redeemedCount={redeemedCount} />
          </>
        ) : null}

        <Button
          type="button"
          variant={status === "ACTIVE" ? "warningTonal" : "successTonal"}
          size="sm"
          disabled={toggleStatus.isPending}
          onClick={() => toggleStatus.mutate(status === "ACTIVE" ? "DISABLED" : "ACTIVE")}
        >
          {status === "ACTIVE" ? <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" /> : <CirclePlay className="h-3.5 w-3.5" aria-hidden="true" />}
          {status === "ACTIVE" ? "停用" : "启用"}
        </Button>

        <Button
          type="button"
          variant="dangerTonal"
          size="sm"
          disabled={!canDelete}
          title={canDelete ? "删除货物" : "已有卡密或兑换记录，不能删除，请停用"}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          删除
        </Button>
      </div>

      <GoodsDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        goodsName={goodsName}
        goodsType={goodsType}
        goodsNote={goodsNote ?? ""}
        textContent={textContent ?? ""}
        error={updateDetails.error}
        pending={updateDetails.isPending}
        onSubmit={(input) => updateDetails.mutate(input)}
      />
      <GoodsUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        goodsId={goodsId}
        goodsName={goodsName}
        error={uploadFiles.error}
        pending={uploadFiles.isPending}
        onSubmitFiles={(files) => uploadFiles.mutate(files)}
      />
      <GoodsDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        goodsName={goodsName}
        error={deleteGoods.error}
        pending={deleteGoods.isPending}
        onConfirm={() => deleteGoods.mutate()}
      />
    </>
  );
}
