import { useState } from "react";
import { AnalyticsShell } from "./analytics/AnalyticsShell";
import { CardKeyStatusChart } from "./analytics/CardKeyStatusChart";
import { DeliveryTrendChart } from "./analytics/DeliveryTrendChart";
import { InventoryCompositionChart } from "./analytics/InventoryCompositionChart";
import { InventoryWarnings } from "./analytics/InventoryWarnings";
import type { AnalyticsPanel, WorkbenchAnalyticsProps } from "./analytics/types";

function AnalyticsPanelContent({
  activePanel,
  fileInventory,
  deliveryTrend,
  cardKeyStatus,
}: WorkbenchAnalyticsProps & { activePanel: AnalyticsPanel }) {
  if (activePanel === "trend") {
    return (
      <div className="grid gap-4 xl:grid-cols-12">
        <DeliveryTrendChart buckets={deliveryTrend} className="xl:col-span-7" />
        <InventoryCompositionChart items={fileInventory} className="xl:col-span-5" />
        <CardKeyStatusChart status={cardKeyStatus} className="xl:col-span-5" />
        <InventoryWarnings items={fileInventory} className="xl:col-span-7" />
      </div>
    );
  }

  if (activePanel === "status") {
    return (
      <div className="grid gap-4 xl:grid-cols-12">
        <CardKeyStatusChart status={cardKeyStatus} className="xl:col-span-5" />
        <DeliveryTrendChart buckets={deliveryTrend} className="xl:col-span-7" />
        <InventoryCompositionChart items={fileInventory} className="xl:col-span-7" />
        <InventoryWarnings items={fileInventory} className="xl:col-span-5" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <InventoryCompositionChart items={fileInventory} className="xl:col-span-7" />
      <DeliveryTrendChart buckets={deliveryTrend} className="xl:col-span-5" />
      <CardKeyStatusChart status={cardKeyStatus} className="xl:col-span-5" />
      <InventoryWarnings items={fileInventory} className="xl:col-span-7" />
    </div>
  );
}

export function WorkbenchAnalytics({ fileInventory, deliveryTrend, cardKeyStatus }: WorkbenchAnalyticsProps) {
  const [activePanel, setActivePanel] = useState<AnalyticsPanel>("inventory");

  return (
    <AnalyticsShell
      fileInventory={fileInventory}
      deliveryTrend={deliveryTrend}
      cardKeyStatus={cardKeyStatus}
      activePanel={activePanel}
      onPanelChange={setActivePanel}
    >
      <AnalyticsPanelContent
        activePanel={activePanel}
        fileInventory={fileInventory}
        deliveryTrend={deliveryTrend}
        cardKeyStatus={cardKeyStatus}
      />
    </AnalyticsShell>
  );
}
