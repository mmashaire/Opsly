import { randomUUID } from "node:crypto";
import type { Item, CreateItemInput } from "@opsly/shared";

export function createItem(input: CreateItemInput): Item {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    sku: input.sku,
    name: input.name,
    unit: input.unit,
    quantityOnHand: input.quantityOnHand,
    createdAt: now,
    updatedAt: now
  };
}