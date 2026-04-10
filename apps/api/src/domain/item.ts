import { randomUUID } from "node:crypto";
import type {
  CreateItemInput,
  CreateCycleCountInput,
  CreateStockPickInput,
  CreateStockAdjustmentInput,
  CreateStockReceiptInput,
  CycleCountResult,
  Item,
  InventoryInvestigationSummary,
  InventoryInvestigationItemSummary,
  OperationsDashboardSummary,
  StockMovement,
} from "@opsly/shared";
import {
  addMovementRecord,
  createItemRecord,
  getItemRecordById,
  listItemRecords,
  listMovementRecordsByItemId,
  updateItemQuantityRecord,
  updateItemReorderThresholdRecord,
} from "../data/store";

const AUDIT_CURSOR_SEPARATOR = "::";

type ItemAuditCursor = {
  createdAt: string;
  id?: string;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeQuantityOnHand(quantityOnHand?: number): number {
  const normalizedQuantity = quantityOnHand ?? 0;

  if (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 0) {
    throw new Error("quantityOnHand must be a non-negative integer.");
  }

  return normalizedQuantity;
}

function normalizeOptionalReorderThreshold(reorderThreshold?: number): number | undefined {
  if (reorderThreshold === undefined) {
    return undefined;
  }

  if (!Number.isInteger(reorderThreshold) || reorderThreshold < 0) {
    throw new Error("reorderThreshold must be a non-negative integer when provided.");
  }

  return reorderThreshold;
}

function normalizeOptionalText(value: string | undefined, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${fieldName} must be a non-empty string when provided.`);
  }

  return normalizedValue;
}

function normalizeAdjustmentDelta(delta: number): number {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error("delta must be a non-zero integer.");
  }

  return delta;
}

function normalizePositiveQuantity(quantity: number, fieldName: string): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return quantity;
}

async function applyStockMovement(input: {
  itemId: string;
  delta: number;
  type: StockMovement["type"];
  reasonCode?: StockMovement["reasonCode"];
  note?: string;
  performedBy?: string;
  supplierReference?: string;
  orderReference?: string;
  underflowErrorMessage?: string;
}): Promise<{
  item: Item;
  movement: StockMovement;
}> {
  const item = await getItemRecordById(input.itemId);

  if (!item) {
    throw new Error("Item not found.");
  }

  const quantityBefore = item.quantityOnHand;
  const quantityAfter = quantityBefore + input.delta;

  if (quantityAfter < 0) {
    throw new Error(input.underflowErrorMessage ?? "Stock movement would reduce stock below zero.");
  }

  const updatedItem = await updateItemQuantityRecord(item.id, quantityAfter);

  if (!updatedItem) {
    throw new Error("Item not found.");
  }

  const movement = await addMovementRecord({
    id: randomUUID(),
    itemId: item.id,
    type: input.type,
    delta: input.delta,
    quantityBefore,
    quantityAfter,
    ...(input.reasonCode === undefined ? {} : { reasonCode: input.reasonCode }),
    ...(input.note === undefined ? {} : { note: normalizeOptionalText(input.note, "note") }),
    ...(input.performedBy === undefined
      ? {}
      : { performedBy: normalizeOptionalText(input.performedBy, "performedBy") }),
    ...(input.supplierReference === undefined
      ? {}
      : { supplierReference: normalizeOptionalText(input.supplierReference, "supplierReference") }),
    ...(input.orderReference === undefined
      ? {}
      : { orderReference: normalizeOptionalText(input.orderReference, "orderReference") }),
    createdAt: new Date().toISOString(),
  });

  return {
    item: updatedItem,
    movement,
  };
}

export async function createItem(input: CreateItemInput): Promise<Item> {
  return createItemRecord({
    sku: normalizeRequiredText(input.sku, "sku"),
    name: normalizeRequiredText(input.name, "name"),
    unit: normalizeRequiredText(input.unit, "unit"),
    quantityOnHand: normalizeQuantityOnHand(input.quantityOnHand),
    ...(input.reorderThreshold === undefined
      ? {}
      : { reorderThreshold: normalizeOptionalReorderThreshold(input.reorderThreshold) }),
  });
}

export async function listItems(): Promise<Item[]> {
  return listItemRecords();
}

function compareLowStockUrgency(left: Item, right: Item): number {
  const leftThreshold = left.reorderThreshold ?? 0;
  const rightThreshold = right.reorderThreshold ?? 0;
  const leftShortage = leftThreshold - left.quantityOnHand;
  const rightShortage = rightThreshold - right.quantityOnHand;

  if (rightShortage !== leftShortage) {
    return rightShortage - leftShortage;
  }

  if (left.quantityOnHand !== right.quantityOnHand) {
    return left.quantityOnHand - right.quantityOnHand;
  }

  return left.sku.localeCompare(right.sku);
}

export async function listLowStockItems(): Promise<Item[]> {
  const items = await listItemRecords();

  return items
    .filter(
      (item) => item.reorderThreshold !== undefined && item.quantityOnHand <= item.reorderThreshold,
    )
    .sort(compareLowStockUrgency);
}

export async function findItemById(itemId: string): Promise<Item | undefined> {
  return getItemRecordById(itemId);
}

export async function listItemMovements(itemId: string): Promise<StockMovement[]> {
  return listMovementRecordsByItemId(itemId);
}

function compareAuditEventsNewestFirst(left: StockMovement, right: StockMovement): number {
  const createdAtCompare = right.createdAt.localeCompare(left.createdAt);

  if (createdAtCompare !== 0) {
    return createdAtCompare;
  }

  return right.id.localeCompare(left.id);
}

export function parseItemAuditCursor(cursor: string): ItemAuditCursor | undefined {
  const normalizedCursor = cursor.trim();

  if (!normalizedCursor) {
    return undefined;
  }

  if (normalizedCursor.includes(AUDIT_CURSOR_SEPARATOR)) {
    const [createdAt, id, ...rest] = normalizedCursor.split(AUDIT_CURSOR_SEPARATOR);

    if (!createdAt || !id || rest.length > 0 || Number.isNaN(Date.parse(createdAt))) {
      return undefined;
    }

    return {
      createdAt: new Date(createdAt).toISOString(),
      id,
    };
  }

  if (Number.isNaN(Date.parse(normalizedCursor))) {
    return undefined;
  }

  return {
    createdAt: new Date(normalizedCursor).toISOString(),
  };
}

export function createItemAuditCursor(event: Pick<StockMovement, "createdAt" | "id">): string {
  return `${event.createdAt}${AUDIT_CURSOR_SEPARATOR}${event.id}`;
}

function isEventBeforeCursor(event: StockMovement, cursor: ItemAuditCursor): boolean {
  const createdAtCompare = event.createdAt.localeCompare(cursor.createdAt);

  if (createdAtCompare < 0) {
    return true;
  }

  if (createdAtCompare > 0) {
    return false;
  }

  if (cursor.id === undefined) {
    return false;
  }

  return event.id.localeCompare(cursor.id) < 0;
}

export async function listItemAuditEvents(
  itemId: string,
  options: {
    limit: number;
    before?: string;
  },
): Promise<StockMovement[]> {
  const movements = await listMovementRecordsByItemId(itemId);
  const sortedByNewestFirst = [...movements].sort(compareAuditEventsNewestFirst);
  const cursor = options.before === undefined ? undefined : parseItemAuditCursor(options.before);
  const filteredByCursor =
    cursor === undefined
      ? sortedByNewestFirst
      : sortedByNewestFirst.filter((movement) => isEventBeforeCursor(movement, cursor));

  return filteredByCursor.slice(0, options.limit);
}

export async function getInventoryInvestigationSummary(input: {
  periodDays: number;
  minimumAdjustmentCount: number;
  itemId?: string;
  reasonCode?: NonNullable<StockMovement["reasonCode"]>;
  minInvestigationScore?: number;
}): Promise<InventoryInvestigationSummary> {
  const now = Date.now();
  const periodStart = now - input.periodDays * 24 * 60 * 60 * 1000;
  const items = await listItemRecords();
  const summaries: InventoryInvestigationItemSummary[] = [];

  for (const item of items) {
    const movements = await listMovementRecordsByItemId(item.id);
    const recentAdjustments = movements.filter((movement) => {
      if (movement.type !== "ADJUSTMENT") {
        return false;
      }

      if (input.reasonCode && movement.reasonCode !== input.reasonCode) {
        return false;
      }

      const createdAtTime = Date.parse(movement.createdAt);

      if (Number.isNaN(createdAtTime)) {
        return false;
      }

      return createdAtTime >= periodStart;
    });

    if (input.itemId && item.id !== input.itemId) {
      continue;
    }

    if (recentAdjustments.length < input.minimumAdjustmentCount) {
      continue;
    }

    const negativeAdjustmentCount = recentAdjustments.filter(
      (movement) => movement.delta < 0,
    ).length;
    const reasonCodeBreakdown: Partial<Record<NonNullable<StockMovement["reasonCode"]>, number>> =
      {};

    for (const adjustment of recentAdjustments) {
      if (!adjustment.reasonCode) {
        continue;
      }

      const currentCount = reasonCodeBreakdown[adjustment.reasonCode] ?? 0;
      reasonCodeBreakdown[adjustment.reasonCode] = currentCount + 1;
    }

    const totalAbsoluteAdjustmentDelta = recentAdjustments.reduce(
      (sum, movement) => sum + Math.abs(movement.delta),
      0,
    );
    const latestAdjustmentAt = recentAdjustments
      .map((movement) => movement.createdAt)
      .sort((left, right) => right.localeCompare(left))[0];

    const investigationScore = negativeAdjustmentCount * 2 + totalAbsoluteAdjustmentDelta;

    if (
      input.minInvestigationScore !== undefined &&
      investigationScore < input.minInvestigationScore
    ) {
      continue;
    }

    summaries.push({
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      currentQuantityOnHand: item.quantityOnHand,
      adjustmentCount: recentAdjustments.length,
      negativeAdjustmentCount,
      reasonCodeBreakdown,
      totalAbsoluteAdjustmentDelta,
      investigationScore,
      latestAdjustmentAt,
    });
  }

  summaries.sort((left, right) => {
    if (right.investigationScore !== left.investigationScore) {
      return right.investigationScore - left.investigationScore;
    }

    return right.latestAdjustmentAt.localeCompare(left.latestAdjustmentAt);
  });

  return {
    generatedAt: new Date(now).toISOString(),
    periodDays: input.periodDays,
    minimumAdjustmentCount: input.minimumAdjustmentCount,
    items: summaries,
  };
}

export async function getOperationsDashboardSummary(input: {
  periodDays: number;
  minimumAdjustmentCount: number;
}): Promise<OperationsDashboardSummary> {
  const now = Date.now();
  const periodStart = now - input.periodDays * 24 * 60 * 60 * 1000;
  const items = await listItemRecords();

  let totalQuantityOnHand = 0;
  let lowStockItemCount = 0;
  let outOfStockItemCount = 0;

  for (const item of items) {
    totalQuantityOnHand += item.quantityOnHand;

    if (item.quantityOnHand === 0) {
      outOfStockItemCount += 1;
    }

    if (item.reorderThreshold !== undefined && item.quantityOnHand <= item.reorderThreshold) {
      lowStockItemCount += 1;
    }
  }

  let receiptMovementCount = 0;
  let pickMovementCount = 0;
  let adjustmentMovementCount = 0;
  let unitsReceived = 0;
  let unitsPicked = 0;
  let netStockChange = 0;

  for (const item of items) {
    const movements = await listMovementRecordsByItemId(item.id);

    for (const movement of movements) {
      const movementCreatedAt = Date.parse(movement.createdAt);

      if (Number.isNaN(movementCreatedAt) || movementCreatedAt < periodStart) {
        continue;
      }

      netStockChange += movement.delta;

      if (movement.type === "RECEIPT") {
        receiptMovementCount += 1;
        unitsReceived += movement.delta;
      }

      if (movement.type === "PICK") {
        pickMovementCount += 1;
        unitsPicked += Math.abs(movement.delta);
      }

      if (movement.type === "ADJUSTMENT") {
        adjustmentMovementCount += 1;
      }
    }
  }

  const investigationSummary = await getInventoryInvestigationSummary({
    periodDays: input.periodDays,
    minimumAdjustmentCount: input.minimumAdjustmentCount,
  });

  return {
    generatedAt: new Date(now).toISOString(),
    periodDays: input.periodDays,
    minimumAdjustmentCount: input.minimumAdjustmentCount,
    inventory: {
      totalItems: items.length,
      totalQuantityOnHand,
      lowStockItemCount,
      outOfStockItemCount,
    },
    activity: {
      receiptMovementCount,
      pickMovementCount,
      adjustmentMovementCount,
      unitsReceived,
      unitsPicked,
      netStockChange,
    },
    investigation: {
      candidateItemCount: investigationSummary.items.length,
    },
  };
}

export async function adjustItemStock(input: CreateStockAdjustmentInput): Promise<{
  item: Item;
  movement: StockMovement;
}> {
  return applyStockMovement({
    itemId: input.itemId,
    delta: normalizeAdjustmentDelta(input.delta),
    type: "ADJUSTMENT",
    reasonCode: input.reasonCode,
    note: input.note,
    performedBy: input.performedBy,
    underflowErrorMessage: "Adjustment would reduce stock below zero.",
  });
}

export async function receiveItemStock(input: CreateStockReceiptInput): Promise<{
  item: Item;
  movement: StockMovement;
}> {
  return applyStockMovement({
    itemId: input.itemId,
    delta: normalizePositiveQuantity(input.quantityReceived, "quantityReceived"),
    type: "RECEIPT",
    note: input.note,
    performedBy: input.performedBy,
    supplierReference: input.supplierReference,
  });
}

export async function pickItemStock(input: CreateStockPickInput): Promise<{
  item: Item;
  movement: StockMovement;
}> {
  return applyStockMovement({
    itemId: input.itemId,
    delta: -normalizePositiveQuantity(input.quantityPicked, "quantityPicked"),
    type: "PICK",
    note: input.note,
    performedBy: input.performedBy,
    orderReference: input.orderReference,
    underflowErrorMessage: "Pick would reduce stock below zero.",
  });
}

export async function conductCycleCount(input: CreateCycleCountInput): Promise<CycleCountResult> {
  const countedQuantity = input.countedQuantity;

  if (!Number.isInteger(countedQuantity) || countedQuantity < 0) {
    throw new Error("countedQuantity must be a non-negative integer.");
  }

  const item = await getItemRecordById(input.itemId);

  if (!item) {
    throw new Error("Item not found.");
  }

  const previousQuantity = item.quantityOnHand;
  const delta = countedQuantity - previousQuantity;

  // Update stock to match the physical count. Even when delta is zero we still
  // write a movement record so the audit trail confirms the count was performed.
  const updatedItem = await updateItemQuantityRecord(item.id, countedQuantity);

  if (!updatedItem) {
    throw new Error("Item not found.");
  }

  const movement = await addMovementRecord({
    id: randomUUID(),
    itemId: item.id,
    type: "ADJUSTMENT",
    delta,
    quantityBefore: previousQuantity,
    quantityAfter: countedQuantity,
    reasonCode: "CYCLE_COUNT",
    ...(input.note === undefined ? {} : { note: normalizeOptionalText(input.note, "note") }),
    ...(input.performedBy === undefined
      ? {}
      : { performedBy: normalizeOptionalText(input.performedBy, "performedBy") }),
    createdAt: new Date().toISOString(),
  });

  return {
    item: updatedItem,
    movement,
    variance: {
      delta,
      countedQuantity,
      previousQuantity,
    },
  };
}

export async function updateItemReorderThreshold(
  itemId: string,
  reorderThreshold: number | undefined,
): Promise<Item> {
  const updatedItem = await updateItemReorderThresholdRecord(
    itemId,
    normalizeOptionalReorderThreshold(reorderThreshold),
  );

  if (!updatedItem) {
    throw new Error("Item not found.");
  }

  return updatedItem;
}
