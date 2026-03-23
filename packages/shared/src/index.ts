export type Role = "admin" | "viewer";

export type ItemId = string;

export type AdjustmentReasonCode =
  | "CYCLE_COUNT"
  | "DAMAGE"
  | "MANUAL_CORRECTION"
  | "RECEIVING_CORRECTION";

export interface Item {
  id: ItemId;
  sku: string;
  name: string;
  unit: string;
  quantityOnHand: number;
  reorderThreshold?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemInput {
  sku: string;
  name: string;
  unit: string;
  quantityOnHand?: number;
  reorderThreshold?: number;
}

export interface CreateStockAdjustmentInput {
  itemId: ItemId;
  delta: number;
  reasonCode: AdjustmentReasonCode;
  note?: string;
  performedBy?: string;
}

export interface CreateStockReceiptInput {
  itemId: ItemId;
  quantityReceived: number;
  note?: string;
  performedBy?: string;
  supplierReference?: string;
}

export interface CreateStockPickInput {
  itemId: ItemId;
  quantityPicked: number;
  note?: string;
  performedBy?: string;
  orderReference?: string;
}

export interface StockMovement {
  id: string;
  itemId: ItemId;
  type: "ADJUSTMENT" | "RECEIPT" | "PICK";
  delta: number;
  quantityBefore: number;
  quantityAfter: number;
  reasonCode?: AdjustmentReasonCode;
  note?: string;
  performedBy?: string;
  supplierReference?: string;
  orderReference?: string;
  createdAt: string;
}
