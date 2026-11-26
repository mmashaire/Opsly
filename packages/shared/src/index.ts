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

export interface CreateCycleCountInput {
  itemId: ItemId;
  countedQuantity: number;
  note?: string;
  performedBy?: string;
}

export interface CycleCountVariance {
  // Positive means more found than recorded; negative means shrinkage.
  delta: number;
  countedQuantity: number;
  previousQuantity: number;
}

export interface CycleCountResult {
  item: Item;
  movement: StockMovement;
  variance: CycleCountVariance;
}

export interface StockMovement {
  id: string;
  itemId: ItemId;
  type: "ADJUSTMENT" | "CYCLE_COUNT" | "RECEIPT" | "PICK";
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

export interface InventoryInvestigationItemSummary {
  itemId: string;
  sku: string;
  name: string;
  currentQuantityOnHand: number;
  adjustmentCount: number;
  negativeAdjustmentCount: number;
  reasonCodeBreakdown: Partial<Record<AdjustmentReasonCode, number>>;
  totalAbsoluteAdjustmentDelta: number;
  investigationScore: number;
  latestAdjustmentAt: string;
}

export interface InventoryInvestigationSummary {
  generatedAt: string;
  periodDays: number;
  minimumAdjustmentCount: number;
  items: InventoryInvestigationItemSummary[];
}

export interface CycleCountAccuracyItemSummary {
  itemId: string;
  sku: string;
  name: string;
  countCount: number;
  exactCountCount: number;
  varianceCount: number;
  accuracyPercent: number;
  shortageUnits: number;
  surplusUnits: number;
  absoluteVarianceUnits: number;
  latestCountAt: string;
}

export interface CycleCountAccuracySummary {
  generatedAt: string;
  periodDays: number;
  totalCountCount: number;
  exactCountCount: number;
  varianceCount: number;
  accuracyPercent: number | null;
  itemsCounted: number;
  shortageUnits: number;
  surplusUnits: number;
  absoluteVarianceUnits: number;
  items: CycleCountAccuracyItemSummary[];
}

export interface OperationsDashboardSummary {
  generatedAt: string;
  periodDays: number;
  minimumAdjustmentCount: number;
  inventory: {
    totalItems: number;
    totalQuantityOnHand: number;
    lowStockItemCount: number;
    outOfStockItemCount: number;
  };
  activity: {
    receiptMovementCount: number;
    pickMovementCount: number;
    adjustmentMovementCount: number;
    cycleCountMovementCount: number;
    unitsReceived: number;
    unitsPicked: number;
    netStockChange: number;
  };
  investigation: {
    candidateItemCount: number;
  };
}

export interface ItemAuditEvent {
  id: string;
  itemId: ItemId;
  eventType: "CREATED" | "STOCK_MODIFIED" | "REORDER_THRESHOLD_UPDATED";
  movementType?: StockMovement["type"];
  delta?: number;
  quantityBefore?: number;
  quantityAfter?: number;
  reasonCode?: AdjustmentReasonCode;
  note?: string;
  performedBy?: string;
  supplierReference?: string;
  orderReference?: string;
  createdAt: string;
}

export interface ItemAuditResponse {
  itemId: ItemId;
  limit: number;
  before?: string;
  hasMore: boolean;
  nextBefore?: string;
  events: ItemAuditEvent[];
}
