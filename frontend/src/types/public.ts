export type Receipt =
  | {
      kind: "TEXT";
      goodsName: string;
      textContent: string;
      redeemedAt: string;
      downloaded: false;
    }
  | {
      kind: "FILE";
      goodsName: string;
      goodsNote?: string;
      redeemedAt: string;
      downloaded: boolean;
      fileQuantity: number;
    };
