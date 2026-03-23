import { randomUUID } from "node:crypto";
import { Pool, type QueryResultRow } from "pg";
import type { CreateItemInput, Item, StockMovement } from "@opsly/shared";

const itemStore = new Map<string, Item>();
const movementStore = new Map<string, StockMovement[]>();

type DataBackend = "memory" | "postgres";

const DATA_BACKEND: DataBackend =
  process.env.OPSLY_DATA_BACKEND === "postgres" ? "postgres" : "memory";

const pool =
  DATA_BACKEND === "postgres" && process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : null;

let postgresInitPromise: Promise<void> | null = null;

function requirePool(): Pool {
  if (!pool) {
    throw new Error("DATABASE_URL is required when OPSLY_DATA_BACKEND=postgres.");
  }

  return pool;
}

async function ensurePostgresSchema(): Promise<void> {
  if (DATA_BACKEND !== "postgres") {
    return;
  }

  if (!postgresInitPromise) {
    postgresInitPromise = (async () => {
      const postgresPool = requirePool();

      await postgresPool.query(`
        CREATE TABLE IF NOT EXISTS items (
          id UUID PRIMARY KEY,
          sku TEXT NOT NULL,
          name TEXT NOT NULL,
          unit TEXT NOT NULL,
          quantity_on_hand INTEGER NOT NULL,
          reorder_threshold INTEGER,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
      `);

      await postgresPool.query(`
        CREATE TABLE IF NOT EXISTS stock_movements (
          id UUID PRIMARY KEY,
          item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          delta INTEGER NOT NULL,
          quantity_before INTEGER NOT NULL,
          quantity_after INTEGER NOT NULL,
          reason_code TEXT,
          note TEXT,
          performed_by TEXT,
          supplier_reference TEXT,
          order_reference TEXT,
          created_at TIMESTAMPTZ NOT NULL
        );
      `);
    })();
  }

  await postgresInitPromise;
}

function mapItemRow(row: QueryResultRow): Item {
  return {
    id: String(row.id),
    sku: String(row.sku),
    name: String(row.name),
    unit: String(row.unit),
    quantityOnHand: Number(row.quantity_on_hand),
    ...(row.reorder_threshold === null || row.reorder_threshold === undefined
      ? {}
      : { reorderThreshold: Number(row.reorder_threshold) }),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapMovementRow(row: QueryResultRow): StockMovement {
  return {
    id: String(row.id),
    itemId: String(row.item_id),
    type: row.type as StockMovement["type"],
    delta: Number(row.delta),
    quantityBefore: Number(row.quantity_before),
    quantityAfter: Number(row.quantity_after),
    ...(row.reason_code === null || row.reason_code === undefined
      ? {}
      : { reasonCode: String(row.reason_code) as StockMovement["reasonCode"] }),
    ...(row.note === null || row.note === undefined ? {} : { note: String(row.note) }),
    ...(row.performed_by === null || row.performed_by === undefined
      ? {}
      : { performedBy: String(row.performed_by) }),
    ...(row.supplier_reference === null || row.supplier_reference === undefined
      ? {}
      : { supplierReference: String(row.supplier_reference) }),
    ...(row.order_reference === null || row.order_reference === undefined
      ? {}
      : { orderReference: String(row.order_reference) }),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function createItemRecord(input: CreateItemInput): Promise<Item> {
  if (DATA_BACKEND === "postgres") {
    await ensurePostgresSchema();

    const postgresPool = requirePool();
    const timestamp = new Date().toISOString();
    const item: Item = {
      id: randomUUID(),
      sku: input.sku,
      name: input.name,
      unit: input.unit,
      quantityOnHand: input.quantityOnHand ?? 0,
      ...(input.reorderThreshold === undefined ? {} : { reorderThreshold: input.reorderThreshold }),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await postgresPool.query(
      `
      INSERT INTO items (
        id, sku, name, unit, quantity_on_hand, reorder_threshold, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        item.id,
        item.sku,
        item.name,
        item.unit,
        item.quantityOnHand,
        item.reorderThreshold ?? null,
        item.createdAt,
        item.updatedAt,
      ],
    );

    return item;
  }

  const timestamp = new Date().toISOString();

  const item: Item = {
    id: randomUUID(),
    sku: input.sku,
    name: input.name,
    unit: input.unit,
    quantityOnHand: input.quantityOnHand ?? 0,
    ...(input.reorderThreshold === undefined ? {} : { reorderThreshold: input.reorderThreshold }),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  itemStore.set(item.id, item);

  return item;
}

export async function listItemRecords(): Promise<Item[]> {
  if (DATA_BACKEND === "postgres") {
    await ensurePostgresSchema();

    const postgresPool = requirePool();
    const result = await postgresPool.query(`SELECT * FROM items ORDER BY created_at ASC`);

    return result.rows.map(mapItemRow);
  }

  return Array.from(itemStore.values());
}

export async function getItemRecordById(itemId: string): Promise<Item | undefined> {
  if (DATA_BACKEND === "postgres") {
    await ensurePostgresSchema();

    const postgresPool = requirePool();
    const result = await postgresPool.query(`SELECT * FROM items WHERE id = $1 LIMIT 1`, [itemId]);

    if (result.rowCount === 0) {
      return undefined;
    }

    return mapItemRow(result.rows[0]);
  }

  return itemStore.get(itemId);
}

export async function updateItemQuantityRecord(
  itemId: string,
  quantityOnHand: number,
): Promise<Item | undefined> {
  if (DATA_BACKEND === "postgres") {
    await ensurePostgresSchema();

    const postgresPool = requirePool();
    const updatedAt = new Date().toISOString();
    const result = await postgresPool.query(
      `
      UPDATE items
      SET quantity_on_hand = $2, updated_at = $3
      WHERE id = $1
      RETURNING *
      `,
      [itemId, quantityOnHand, updatedAt],
    );

    if (result.rowCount === 0) {
      return undefined;
    }

    return mapItemRow(result.rows[0]);
  }

  const existingItem = itemStore.get(itemId);

  if (!existingItem) {
    return undefined;
  }

  const updatedItem: Item = {
    ...existingItem,
    quantityOnHand,
    updatedAt: new Date().toISOString(),
  };

  itemStore.set(itemId, updatedItem);

  return updatedItem;
}

export async function updateItemReorderThresholdRecord(
  itemId: string,
  reorderThreshold: number | undefined,
): Promise<Item | undefined> {
  if (DATA_BACKEND === "postgres") {
    await ensurePostgresSchema();

    const postgresPool = requirePool();
    const updatedAt = new Date().toISOString();
    const result = await postgresPool.query(
      `
      UPDATE items
      SET reorder_threshold = $2, updated_at = $3
      WHERE id = $1
      RETURNING *
      `,
      [itemId, reorderThreshold ?? null, updatedAt],
    );

    if (result.rowCount === 0) {
      return undefined;
    }

    return mapItemRow(result.rows[0]);
  }

  const existingItem = itemStore.get(itemId);

  if (!existingItem) {
    return undefined;
  }

  const { reorderThreshold: _existingThreshold, ...itemWithoutThreshold } = existingItem;

  const updatedItem: Item = {
    ...itemWithoutThreshold,
    ...(reorderThreshold === undefined ? {} : { reorderThreshold }),
    updatedAt: new Date().toISOString(),
  };

  itemStore.set(itemId, updatedItem);

  return updatedItem;
}

export async function addMovementRecord(movement: StockMovement): Promise<StockMovement> {
  if (DATA_BACKEND === "postgres") {
    await ensurePostgresSchema();

    const postgresPool = requirePool();

    await postgresPool.query(
      `
      INSERT INTO stock_movements (
        id,
        item_id,
        type,
        delta,
        quantity_before,
        quantity_after,
        reason_code,
        note,
        performed_by,
        supplier_reference,
        order_reference,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        movement.id,
        movement.itemId,
        movement.type,
        movement.delta,
        movement.quantityBefore,
        movement.quantityAfter,
        movement.reasonCode ?? null,
        movement.note ?? null,
        movement.performedBy ?? null,
        movement.supplierReference ?? null,
        movement.orderReference ?? null,
        movement.createdAt,
      ],
    );

    return movement;
  }

  const existingMovements = movementStore.get(movement.itemId) ?? [];
  const updatedMovements = [...existingMovements, movement];

  movementStore.set(movement.itemId, updatedMovements);

  return movement;
}

export async function listMovementRecordsByItemId(itemId: string): Promise<StockMovement[]> {
  if (DATA_BACKEND === "postgres") {
    await ensurePostgresSchema();

    const postgresPool = requirePool();
    const result = await postgresPool.query(
      `SELECT * FROM stock_movements WHERE item_id = $1 ORDER BY created_at ASC`,
      [itemId],
    );

    return result.rows.map(mapMovementRow);
  }

  return movementStore.get(itemId) ?? [];
}

export function clearItemStore(): void {
  itemStore.clear();
}

export function clearMovementStore(): void {
  movementStore.clear();
}
