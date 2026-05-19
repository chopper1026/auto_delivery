"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction, writeAdminAuditLog } from "@/lib/admin/action-auth";
import { updateCardKeyDeliveryMessageTemplate, updateServiceBaseUrl } from "@/lib/settings/service";

export type UpdateSystemSettingsState = {
  saved?: boolean;
  serviceBaseUrl?: string;
  cardKeyDeliveryMessageTemplate?: string;
  error?: string;
};

export async function updateSystemSettingsAction(
  _previousState: UpdateSystemSettingsState,
  formData: FormData,
): Promise<UpdateSystemSettingsState> {
  const { admin, meta } = await requireAdminAction(formData);
  const rawServiceBaseUrl = String(formData.get("serviceBaseUrl") ?? "");
  const rawCardKeyDeliveryMessageTemplate = String(formData.get("cardKeyDeliveryMessageTemplate") ?? "");

  try {
    const serviceBaseUrl = await updateServiceBaseUrl(rawServiceBaseUrl);
    const cardKeyDeliveryMessageTemplate = await updateCardKeyDeliveryMessageTemplate(rawCardKeyDeliveryMessageTemplate);

    await writeAdminAuditLog({
      adminUserId: admin.id,
      action: "settings.update_preferences",
      entityType: "SystemSetting",
      entityId: "preferences",
      metadata: { serviceBaseUrl, cardKeyDeliveryMessageTemplate },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    revalidatePath("/admin/settings");
    revalidatePath("/admin/cards");

    return { saved: true, serviceBaseUrl, cardKeyDeliveryMessageTemplate };
  } catch {
    return { error: "请输入以 http:// 或 https:// 开头的完整服务地址。" };
  }
}
