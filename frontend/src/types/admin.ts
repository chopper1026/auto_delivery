export type AdminSession = {
  admin: {
    id: string;
    username: string;
  };
  csrfToken: string;
};

export type FileInventoryStat = {
  goodsId: string;
  goodsName: string;
  total: number;
  available: number;
  reserved: number;
  redeemed: number;
};

export type DeliveryTrendDay = {
  dateKey: string;
  label: string;
  redemptions: number;
  downloads: number;
};

export type CardKeyStatusDistribution = {
  active: number;
  redeemed: number;
  expired: number;
  total: number;
  activePercent: number;
  redeemedPercent: number;
  expiredPercent: number;
};

export type Overview = {
  totalCardKeys: number;
  activeCardKeys: number;
  redeemedCardKeys: number;
  expiredCardKeys: number;
  todaysRedemptions: number;
  todaysDownloads: number;
  fileInventory: FileInventoryStat[];
  cardKeyStatus: CardKeyStatusDistribution;
  deliveryTrend: DeliveryTrendDay[];
};

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  username?: string;
  ipAddress: string;
  userAgent: string;
  metadata?: string;
  createdAt: string;
};

export type LogType = "redemptions" | "downloads" | "admin";

export type RedemptionLogItem = {
  id: string;
  redeemedAt: string;
  cardKeyMask: string;
  goodsName: string;
  ipAddress: string;
  userAgent: string;
};

export type DownloadResult = "SUCCESS" | "ALREADY_DOWNLOADED" | "NOT_FOUND" | "ERROR";

export type DownloadLogItem = {
  id: string;
  createdAt: string;
  result: DownloadResult;
  cardKeyMask?: string;
  goodsName?: string;
  ipAddress: string;
  userAgent: string;
};

export type AdminLogItem = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId?: string;
  username?: string;
  ipAddress: string;
  userAgent: string;
  metadata?: string;
};

type LogsBase = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type LogsResponse =
  | (LogsBase & { type: "redemptions"; items: RedemptionLogItem[] })
  | (LogsBase & { type: "downloads"; items: DownloadLogItem[] })
  | (LogsBase & { type: "admin"; items: AdminLogItem[] });

export type Settings = {
  serviceBaseUrl: string;
  deliveryMessageTemplate: string;
};
