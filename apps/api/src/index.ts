import express from "express";
import { z } from "zod";
import { DUPLICATE_SKU_ERROR_MESSAGE } from "./data/store";
import { requireAdminRole, resolveRoleMiddleware } from "./middleware/authorization";
import { corsMiddleware } from "./middleware/cors";
import { requestContextMiddleware } from "./middleware/requestContext";
import {
  adjustItemStock,
  createItemAuditCursor,
  conductCycleCount,
  createItem,
  findItemById,
  getInventoryInvestigationSummary,
  getOperationsDashboardSummary,
  listItemAuditEvents,
  listLowStockItems,
  listItemMovements,
  parseItemAuditCursor,
  listItems,
  pickItemStock,
  receiveItemStock,
  updateItemReorderThreshold,
} from "./domain/item";

const adjustmentReasonCodes = [
  "CYCLE_COUNT",
  "DAMAGE",
  "MANUAL_CORRECTION",
  "RECEIVING_CORRECTION",
] as const;

const createItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  unit: z.string().min(1),
  quantityOnHand: z.number().int().nonnegative().optional(),
  reorderThreshold: z.number().int().nonnegative().optional(),
});

const stockAdjustmentSchema = z.object({
  delta: z
    .number()
    .int()
    .refine((value) => value !== 0, {
      message: "delta must be non-zero.",
    }),
  reasonCode: z.enum(adjustmentReasonCodes),
  note: z.string().min(1).optional(),
  performedBy: z.string().min(1).optional(),
});

const stockReceiptSchema = z.object({
  quantityReceived: z.number().int().positive(),
  note: z.string().min(1).optional(),
  performedBy: z.string().min(1).optional(),
  supplierReference: z.string().min(1).optional(),
});

const stockPickSchema = z.object({
  quantityPicked: z.number().int().positive(),
  note: z.string().min(1).optional(),
  performedBy: z.string().min(1).optional(),
  orderReference: z.string().min(1).optional(),
});

const updateItemSchema = z.object({
  reorderThreshold: z.number().int().nonnegative().nullable(),
});

const cycleCountSchema = z.object({
  countedQuantity: z.number().int().nonnegative(),
  note: z.string().min(1).optional(),
  performedBy: z.string().min(1).optional(),
});

const inventoryInvestigationQuerySchema = z.object({
  periodDays: z.coerce.number().int().positive().max(365).default(30),
  minimumAdjustmentCount: z.coerce.number().int().positive().max(100).default(2),
  itemId: z.string().trim().min(1).optional(),
  reasonCode: z.enum(adjustmentReasonCodes).optional(),
  minInvestigationScore: z.coerce.number().int().nonnegative().optional(),
});

const itemAuditQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  before: z.string().trim().min(1).optional(),
});

const operationsDashboardQuerySchema = z.object({
  periodDays: z.coerce.number().int().positive().max(365).default(1),
  minimumAdjustmentCount: z.coerce.number().int().positive().max(100).default(2),
});

function parseItemIdParam(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const itemId = value.trim();

  return itemId ? itemId : undefined;
}

function toItemAuditEvent(event: {
  id: string;
  itemId: string;
  type: "ADJUSTMENT" | "RECEIPT" | "PICK";
  delta: number;
  quantityBefore: number;
  quantityAfter: number;
  reasonCode?: "CYCLE_COUNT" | "DAMAGE" | "MANUAL_CORRECTION" | "RECEIVING_CORRECTION";
  note?: string;
  performedBy?: string;
  supplierReference?: string;
  orderReference?: string;
  createdAt: string;
}) {
  return {
    id: event.id,
    itemId: event.itemId,
    eventType: "STOCK_MODIFIED",
    movementType: event.type,
    delta: event.delta,
    quantityBefore: event.quantityBefore,
    quantityAfter: event.quantityAfter,
    ...(event.reasonCode === undefined ? {} : { reasonCode: event.reasonCode }),
    ...(event.note === undefined ? {} : { note: event.note }),
    ...(event.performedBy === undefined ? {} : { performedBy: event.performedBy }),
    ...(event.supplierReference === undefined
      ? {}
      : { supplierReference: event.supplierReference }),
    ...(event.orderReference === undefined ? {} : { orderReference: event.orderReference }),
    createdAt: event.createdAt,
  };
}

export function createApp() {
  const app = express();

  app.use(requestContextMiddleware);
  app.use(corsMiddleware);
  app.use(resolveRoleMiddleware);
  app.use(express.json());

  app.get("/", (_request, response) => {
    response.status(200).json({
      service: "opsly-api",
      status: "ok",
      health: "/health",
    });
  });

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.get("/items", (_request, response) => {
    return listItems().then((items) => response.status(200).json(items));
  });

  app.get("/alerts/low-stock", (_request, response) => {
    return listLowStockItems().then((items) => response.status(200).json(items));
  });

  app.get("/dashboard/operations-summary", requireAdminRole, async (request, response) => {
    const parseResult = operationsDashboardQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid operations dashboard query.",
          details: parseResult.error.flatten(),
        },
      });
    }

    const summary = await getOperationsDashboardSummary({
      periodDays: parseResult.data.periodDays,
      minimumAdjustmentCount: parseResult.data.minimumAdjustmentCount,
    });

    return response.status(200).json(summary);
  });

  app.get("/investigations/inventory-mismatch", requireAdminRole, async (request, response) => {
    const parseResult = inventoryInvestigationQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid inventory investigation query.",
          details: parseResult.error.flatten(),
        },
      });
    }

    const summary = await getInventoryInvestigationSummary({
      periodDays: parseResult.data.periodDays,
      minimumAdjustmentCount: parseResult.data.minimumAdjustmentCount,
      ...(parseResult.data.itemId === undefined ? {} : { itemId: parseResult.data.itemId }),
      ...(parseResult.data.reasonCode === undefined
        ? {}
        : { reasonCode: parseResult.data.reasonCode }),
      ...(parseResult.data.minInvestigationScore === undefined
        ? {}
        : { minInvestigationScore: parseResult.data.minInvestigationScore }),
    });

    return response.status(200).json(summary);
  });

  app.get("/items/:itemId", async (request, response) => {
    const itemId = parseItemIdParam(request.params.itemId);

    if (!itemId) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid item id path parameter.",
        },
      });
    }

    const item = await findItemById(itemId);

    if (!item) {
      return response.status(404).json({
        error: {
          code: "ITEM_NOT_FOUND",
          message: "Item not found.",
        },
      });
    }

    return response.status(200).json(item);
  });

  app.post("/items", requireAdminRole, async (request, response) => {
    const parseResult = createItemSchema.safeParse(request.body);

    if (!parseResult.success) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid item payload.",
          details: parseResult.error.flatten(),
        },
      });
    }

    try {
      const item = await createItem({
        sku: parseResult.data.sku,
        name: parseResult.data.name,
        unit: parseResult.data.unit,
        ...(parseResult.data.quantityOnHand === undefined
          ? {}
          : { quantityOnHand: parseResult.data.quantityOnHand }),
        ...(parseResult.data.reorderThreshold === undefined
          ? {}
          : { reorderThreshold: parseResult.data.reorderThreshold }),
      });

      return response.status(201).json(item);
    } catch (error) {
      if (error instanceof Error && error.message === DUPLICATE_SKU_ERROR_MESSAGE) {
        return response.status(409).json({
          error: {
            code: "DUPLICATE_SKU",
            message: error.message,
          },
        });
      }

      return response.status(400).json({
        error: {
          code: "INVALID_ITEM",
          message: error instanceof Error ? error.message : "Invalid item input.",
        },
      });
    }
  });

  app.post("/items/:itemId/adjustments", requireAdminRole, async (request, response) => {
    const itemId = parseItemIdParam(request.params.itemId);

    if (!itemId) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid item id path parameter.",
        },
      });
    }

    const item = await findItemById(itemId);

    if (!item) {
      return response.status(404).json({
        error: {
          code: "ITEM_NOT_FOUND",
          message: "Item not found.",
        },
      });
    }

    const parseResult = stockAdjustmentSchema.safeParse(request.body);

    if (!parseResult.success) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid stock adjustment payload.",
          details: parseResult.error.flatten(),
        },
      });
    }

    try {
      const adjustmentResult = await adjustItemStock({
        itemId: item.id,
        ...parseResult.data,
      });

      return response.status(200).json(adjustmentResult);
    } catch (error) {
      return response.status(400).json({
        error: {
          code: "INVALID_ADJUSTMENT",
          message: error instanceof Error ? error.message : "Invalid adjustment input.",
        },
      });
    }
  });

  app.patch("/items/:itemId", requireAdminRole, async (request, response) => {
    const itemId = parseItemIdParam(request.params.itemId);

    if (!itemId) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid item id path parameter.",
        },
      });
    }

    const item = await findItemById(itemId);

    if (!item) {
      return response.status(404).json({
        error: {
          code: "ITEM_NOT_FOUND",
          message: "Item not found.",
        },
      });
    }

    const parseResult = updateItemSchema.safeParse(request.body);

    if (!parseResult.success) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid item update payload.",
          details: parseResult.error.flatten(),
        },
      });
    }

    try {
      const updatedItem = await updateItemReorderThreshold(
        item.id,
        parseResult.data.reorderThreshold === null ? undefined : parseResult.data.reorderThreshold,
      );

      return response.status(200).json(updatedItem);
    } catch (error) {
      return response.status(400).json({
        error: {
          code: "INVALID_ITEM",
          message: error instanceof Error ? error.message : "Invalid item update input.",
        },
      });
    }
  });

  app.get("/items/:itemId/movements", async (request, response) => {
    const itemId = parseItemIdParam(request.params.itemId);

    if (!itemId) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid item id path parameter.",
        },
      });
    }

    const item = await findItemById(itemId);

    if (!item) {
      return response.status(404).json({
        error: {
          code: "ITEM_NOT_FOUND",
          message: "Item not found.",
        },
      });
    }

    return response.status(200).json(await listItemMovements(item.id));
  });

  app.get("/items/:itemId/audit", requireAdminRole, async (request, response) => {
    const itemId = parseItemIdParam(request.params.itemId);

    if (!itemId) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid item id path parameter.",
        },
      });
    }

    const item = await findItemById(itemId);

    if (!item) {
      return response.status(404).json({
        error: {
          code: "ITEM_NOT_FOUND",
          message: "Item not found.",
        },
      });
    }

    const parseResult = itemAuditQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid item audit query.",
          details: parseResult.error.flatten(),
        },
      });
    }

    if (
      parseResult.data.before !== undefined &&
      parseItemAuditCursor(parseResult.data.before) === undefined
    ) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid item audit query.",
          details: {
            formErrors: [],
            fieldErrors: {
              before: ["before must be a valid audit cursor."],
            },
          },
        },
      });
    }

    const eventsWithProbe = await listItemAuditEvents(item.id, {
      limit: parseResult.data.limit + 1,
      ...(parseResult.data.before === undefined ? {} : { before: parseResult.data.before }),
    });
    const hasMore = eventsWithProbe.length > parseResult.data.limit;
    const events = (
      hasMore ? eventsWithProbe.slice(0, parseResult.data.limit) : eventsWithProbe
    ).map(toItemAuditEvent);
    const nextBefore =
      hasMore && events[events.length - 1]
        ? createItemAuditCursor(events[events.length - 1])
        : undefined;

    return response.status(200).json({
      itemId: item.id,
      limit: parseResult.data.limit,
      ...(parseResult.data.before === undefined ? {} : { before: parseResult.data.before }),
      hasMore,
      ...(nextBefore === undefined ? {} : { nextBefore }),
      events,
    });
  });

  app.post("/items/:itemId/receipts", requireAdminRole, async (request, response) => {
    const itemId = parseItemIdParam(request.params.itemId);

    if (!itemId) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid item id path parameter.",
        },
      });
    }

    const item = await findItemById(itemId);

    if (!item) {
      return response.status(404).json({
        error: {
          code: "ITEM_NOT_FOUND",
          message: "Item not found.",
        },
      });
    }

    const parseResult = stockReceiptSchema.safeParse(request.body);

    if (!parseResult.success) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid stock receipt payload.",
          details: parseResult.error.flatten(),
        },
      });
    }

    try {
      const receiptResult = await receiveItemStock({
        itemId: item.id,
        ...parseResult.data,
      });

      return response.status(200).json(receiptResult);
    } catch (error) {
      return response.status(400).json({
        error: {
          code: "INVALID_RECEIPT",
          message: error instanceof Error ? error.message : "Invalid receipt input.",
        },
      });
    }
  });

  app.post("/items/:itemId/picks", requireAdminRole, async (request, response) => {
    const itemId = parseItemIdParam(request.params.itemId);

    if (!itemId) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid item id path parameter.",
        },
      });
    }

    const item = await findItemById(itemId);

    if (!item) {
      return response.status(404).json({
        error: {
          code: "ITEM_NOT_FOUND",
          message: "Item not found.",
        },
      });
    }

    const parseResult = stockPickSchema.safeParse(request.body);

    if (!parseResult.success) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid stock pick payload.",
          details: parseResult.error.flatten(),
        },
      });
    }

    try {
      const pickResult = await pickItemStock({
        itemId: item.id,
        ...parseResult.data,
      });

      return response.status(200).json(pickResult);
    } catch (error) {
      return response.status(400).json({
        error: {
          code: "INVALID_PICK",
          message: error instanceof Error ? error.message : "Invalid pick input.",
        },
      });
    }
  });

  app.post("/items/:itemId/cycle-counts", requireAdminRole, async (request, response) => {
    const itemId = parseItemIdParam(request.params.itemId);

    if (!itemId) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid item id path parameter.",
        },
      });
    }

    const item = await findItemById(itemId);

    if (!item) {
      return response.status(404).json({
        error: {
          code: "ITEM_NOT_FOUND",
          message: "Item not found.",
        },
      });
    }

    const parseResult = cycleCountSchema.safeParse(request.body);

    if (!parseResult.success) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid cycle count payload.",
          details: parseResult.error.flatten(),
        },
      });
    }

    try {
      const countResult = await conductCycleCount({
        itemId: item.id,
        ...parseResult.data,
      });

      return response.status(200).json(countResult);
    } catch (error) {
      return response.status(400).json({
        error: {
          code: "INVALID_CYCLE_COUNT",
          message: error instanceof Error ? error.message : "Invalid cycle count input.",
        },
      });
    }
  });

  return app;
}
