import { randomUUID } from "node:crypto";
import type {
  CreateItemInput,
  CreateStockPickInput,
  CreateStockAdjustmentInput,
  CreateStockReceiptInput,
  Item,
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

export async function listLowStockItems(): Promise<Item[]> {
  const items = await listItemRecords();

  return items.filter(
    (item) => item.reorderThreshold !== undefined && item.quantityOnHand <= item.reorderThreshold,
  );
}

export async function findItemById(itemId: string): Promise<Item | undefined> {
  return getItemRecordById(itemId);
}

export async function listItemMovements(itemId: string): Promise<StockMovement[]> {
  return listMovementRecordsByItemId(itemId);
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
