export type GoodsType = "TEXT" | "FILE";
export type GoodsStatus = "ACTIVE" | "DISABLED";
export type CardKeyStatus = "ACTIVE" | "REDEEMED" | "EXPIRED" | "DELETED";

export type Inventory = {
  total: number;
  available: number;
  reserved: number;
  redeemed: number;
};

export type Goods = {
  id: string;
  name: string;
  type: GoodsType;
  textContent?: string;
  note?: string;
  status: GoodsStatus;
  createdAt: string;
  updatedAt: string;
  inventory: Inventory;
  usage: {
    cardKeys: number;
    redemptions: number;
  };
};

export type PaginatedGoodsResponse = {
  items: Goods[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type UpdateGoodsInput = {
  name?: string;
  textContent?: string;
  note?: string;
  status?: GoodsStatus;
};

export type CardKey = {
  id: string;
  keyMask: string;
  goodsId: string;
  goodsName: string;
  goodsType: GoodsType;
  fileQuantity: number;
  expiresAt?: string;
  status: CardKeyStatus;
  createdAt: string;
  redeemedAt?: string;
  deletedAt?: string;
};

export type PaginatedCardKeysResponse = {
  items: CardKey[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
