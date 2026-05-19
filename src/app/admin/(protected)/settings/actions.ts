"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction, writeAdminAuditLog } from "@/lib/admin/action-auth";
import { updateServiceBaseUrl } from "@/lib/settings/service";

export type UpdateSystemSettingsState = {
  saved?: boolean;
  serviceBaseUrl?: string;
  error?: string;
};

export async function updateSystemSettingsAction(
  _previousState: UpdateSystemSettingsState,
  formData: FormData,
): Promise<UpdateSystemSettingsState> {
  const { admin, meta } = await requireAdminAction(formData);
  const rawServiceBaseUrl = String(formData.get("serviceBaseUrl") ?? "");

  try {
    const serviceBaseUrl = await updateServiceBaseUrl(rawServiceBaseUrl);

    await writeAdminAuditLog({
      adminUserId: admin.id,
      action: "settings.update_service_base_url",
      entityType: "SystemSetting",
      entityId: "serviceBaseUrl",
      metadata: { serviceBaseUrl },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    revalidatePath("/admin/settings");
    revalidatePath("/admin/cards");

    return { saved: true, serviceBaseUrl };
  } catch {
    return { error: "请输入以 http:// 或 https:// 开头的完整服务地址。" };
  }
}
