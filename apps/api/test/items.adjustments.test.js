import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { clearItemStore, clearMovementStore } from "../src/data/store";
import { createApp } from "../src/index";
const ADMIN_HEADERS = { "x-opsly-role": "admin" };
describe("item stock adjustments", () => {
  beforeEach(() => {
    clearItemStore();
    clearMovementStore();
  });
  it("applies a valid stock increase adjustment and writes a movement", async () => {
    const app = createApp();
    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-100",
      name: "Widget",
      unit: "each",
      quantityOnHand: 10,
    });
    const itemId = itemResponse.body.id;
    const adjustmentResponse = await request(app)
      .post(`/items/${itemId}/adjustments`)
      .set(ADMIN_HEADERS)
      .send({
        delta: 5,
        reasonCode: "RECEIVING_CORRECTION",
        note: "Counted one extra case.",
        performedBy: "shift_lead",
      });
    expect(adjustmentResponse.status).toBe(200);
    expect(adjustmentResponse.body.item.quantityOnHand).toBe(15);
    expect(adjustmentResponse.body.movement).toMatchObject({
      itemId,
      type: "ADJUSTMENT",
      delta: 5,
      quantityBefore: 10,
      quantityAfter: 15,
      reasonCode: "RECEIVING_CORRECTION",
      note: "Counted one extra case.",
      performedBy: "shift_lead",
    });
    const movementResponse = await request(app).get(`/items/${itemId}/movements`);
    expect(movementResponse.status).toBe(200);
    expect(movementResponse.body).toHaveLength(1);
    expect(movementResponse.body[0]).toMatchObject({
      itemId,
      delta: 5,
      quantityBefore: 10,
      quantityAfter: 15,
      reasonCode: "RECEIVING_CORRECTION",
    });
  });
  it("rejects an adjustment that would reduce stock below zero", async () => {
    const app = createApp();
    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-200",
      name: "Pallet wrap",
      unit: "roll",
      quantityOnHand: 2,
    });
    const itemId = itemResponse.body.id;
    const adjustmentResponse = await request(app)
      .post(`/items/${itemId}/adjustments`)
      .set(ADMIN_HEADERS)
      .send({
        delta: -3,
        reasonCode: "DAMAGE",
      });
    expect(adjustmentResponse.status).toBe(400);
    expect(adjustmentResponse.body).toMatchObject({
      error: {
        code: "INVALID_ADJUSTMENT",
        message: "Adjustment would reduce stock below zero.",
      },
    });
  });
  it("returns 404 when adjusting a non-existent item", async () => {
    const app = createApp();
    const adjustmentResponse = await request(app)
      .post("/items/missing-item/adjustments")
      .set(ADMIN_HEADERS)
      .send({
        delta: 1,
        reasonCode: "MANUAL_CORRECTION",
      });
    expect(adjustmentResponse.status).toBe(404);
    expect(adjustmentResponse.body).toEqual({
      error: {
        code: "ITEM_NOT_FOUND",
        message: "Item not found.",
      },
    });
  });
  it("returns 400 for invalid adjustment payload", async () => {
    const app = createApp();
    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-300",
      name: "Label",
      unit: "each",
      quantityOnHand: 25,
    });
    const itemId = itemResponse.body.id;
    const adjustmentResponse = await request(app)
      .post(`/items/${itemId}/adjustments`)
      .set(ADMIN_HEADERS)
      .send({
        delta: 0,
        reasonCode: "INVALID_REASON",
      });
    expect(adjustmentResponse.status).toBe(400);
    expect(adjustmentResponse.body.error.code).toBe("INVALID_REQUEST");
  });
  it("returns 400 when reasonCode is missing", async () => {
    const app = createApp();
    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-301",
      name: "Label",
      unit: "each",
      quantityOnHand: 25,
    });
    const itemId = itemResponse.body.id;
    const adjustmentResponse = await request(app)
      .post(`/items/${itemId}/adjustments`)
      .set(ADMIN_HEADERS)
      .send({
        delta: 2,
      });
    expect(adjustmentResponse.status).toBe(400);
    expect(adjustmentResponse.body.error.code).toBe("INVALID_REQUEST");
  });
  it("returns movement history in insertion order", async () => {
    const app = createApp();
    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-400",
      name: "Tape",
      unit: "roll",
      quantityOnHand: 10,
    });
    const itemId = itemResponse.body.id;
    await request(app).post(`/items/${itemId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: 4,
      reasonCode: "RECEIVING_CORRECTION",
    });
    await request(app).post(`/items/${itemId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -3,
      reasonCode: "CYCLE_COUNT",
    });
    const movementResponse = await request(app).get(`/items/${itemId}/movements`);
    expect(movementResponse.status).toBe(200);
    expect(movementResponse.body).toHaveLength(2);
    expect(movementResponse.body[0]).toMatchObject({
      delta: 4,
      quantityBefore: 10,
      quantityAfter: 14,
    });
    expect(movementResponse.body[1]).toMatchObject({
      delta: -3,
      quantityBefore: 14,
      quantityAfter: 11,
    });
  });
});
