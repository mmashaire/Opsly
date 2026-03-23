import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { clearItemStore, clearMovementStore } from "../src/data/store";
import { createApp } from "../src/index";

const ADMIN_HEADERS = { "x-opsly-role": "admin" };

describe("item stock receipts", () => {
  beforeEach(() => {
    clearItemStore();
    clearMovementStore();
  });

  it("applies a valid receipt and appends a RECEIPT movement", async () => {
    const app = createApp();

    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-R-100",
      name: "Case labels",
      unit: "pack",
      quantityOnHand: 12,
    });

    const itemId = itemResponse.body.id;

    const receiptResponse = await request(app)
      .post(`/items/${itemId}/receipts`)
      .set(ADMIN_HEADERS)
      .send({
        quantityReceived: 8,
        note: "Inbound shipment ASN-42",
        performedBy: "receiver_a",
        supplierReference: "ASN-42",
      });

    expect(receiptResponse.status).toBe(200);
    expect(receiptResponse.body.item.quantityOnHand).toBe(20);
    expect(receiptResponse.body.movement).toMatchObject({
      itemId,
      type: "RECEIPT",
      delta: 8,
      quantityBefore: 12,
      quantityAfter: 20,
      note: "Inbound shipment ASN-42",
      performedBy: "receiver_a",
      supplierReference: "ASN-42",
    });
  });

  it("returns 400 for invalid receipt payload", async () => {
    const app = createApp();

    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-R-200",
      name: "Stretch film",
      unit: "roll",
      quantityOnHand: 4,
    });

    const itemId = itemResponse.body.id;

    const receiptResponse = await request(app)
      .post(`/items/${itemId}/receipts`)
      .set(ADMIN_HEADERS)
      .send({
        quantityReceived: 0,
      });

    expect(receiptResponse.status).toBe(400);
    expect(receiptResponse.body.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 404 when receiving for a non-existent item", async () => {
    const app = createApp();

    const receiptResponse = await request(app)
      .post("/items/missing-item/receipts")
      .set(ADMIN_HEADERS)
      .send({
        quantityReceived: 3,
      });

    expect(receiptResponse.status).toBe(404);
    expect(receiptResponse.body).toEqual({
      error: {
        code: "ITEM_NOT_FOUND",
        message: "Item not found.",
      },
    });
  });

  it("mixes receipt and adjustment movements in history", async () => {
    const app = createApp();

    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-R-300",
      name: "Packing tape",
      unit: "roll",
      quantityOnHand: 10,
    });

    const itemId = itemResponse.body.id;

    await request(app).post(`/items/${itemId}/receipts`).set(ADMIN_HEADERS).send({
      quantityReceived: 5,
      supplierReference: "PO-123",
    });

    await request(app).post(`/items/${itemId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -2,
      reasonCode: "CYCLE_COUNT",
    });

    const movementResponse = await request(app).get(`/items/${itemId}/movements`);

    expect(movementResponse.status).toBe(200);
    expect(movementResponse.body).toHaveLength(2);
    expect(movementResponse.body[0]).toMatchObject({
      type: "RECEIPT",
      delta: 5,
      supplierReference: "PO-123",
    });
    expect(movementResponse.body[1]).toMatchObject({
      type: "ADJUSTMENT",
      delta: -2,
      reasonCode: "CYCLE_COUNT",
    });
  });
});
