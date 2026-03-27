import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { clearItemStore, clearMovementStore } from "../src/data/store";
import { createApp } from "../src/index";

const ADMIN_HEADERS = { "x-opsly-role": "admin" };

describe("inventory mismatch investigation", () => {
  beforeEach(() => {
    clearItemStore();
    clearMovementStore();
  });

  it("returns ranked investigation candidates based on adjustment patterns", async () => {
    const app = createApp();

    const itemAResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-I-100",
      name: "Blue tote",
      unit: "each",
      quantityOnHand: 30,
    });

    const itemBResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-I-200",
      name: "Pallet guard",
      unit: "each",
      quantityOnHand: 20,
    });

    const itemAId = itemAResponse.body.id;
    const itemBId = itemBResponse.body.id;

    await request(app).post(`/items/${itemAId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -5,
      reasonCode: "DAMAGE",
    });

    await request(app).post(`/items/${itemAId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -3,
      reasonCode: "CYCLE_COUNT",
    });

    await request(app).post(`/items/${itemBId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: 2,
      reasonCode: "MANUAL_CORRECTION",
    });

    await request(app).post(`/items/${itemBId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: 1,
      reasonCode: "RECEIVING_CORRECTION",
    });

    const response = await request(app)
      .get("/investigations/inventory-mismatch?periodDays=30&minimumAdjustmentCount=2")
      .set(ADMIN_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body.periodDays).toBe(30);
    expect(response.body.minimumAdjustmentCount).toBe(2);
    expect(response.body.items).toHaveLength(2);

    expect(response.body.items[0]).toMatchObject({
      itemId: itemAId,
      sku: "SKU-I-100",
      adjustmentCount: 2,
      negativeAdjustmentCount: 2,
      reasonCodeBreakdown: {
        DAMAGE: 1,
        CYCLE_COUNT: 1,
      },
      totalAbsoluteAdjustmentDelta: 8,
      investigationScore: 12,
    });

    expect(response.body.items[1]).toMatchObject({
      itemId: itemBId,
      sku: "SKU-I-200",
      adjustmentCount: 2,
      negativeAdjustmentCount: 0,
      reasonCodeBreakdown: {
        MANUAL_CORRECTION: 1,
        RECEIVING_CORRECTION: 1,
      },
      totalAbsoluteAdjustmentDelta: 3,
      investigationScore: 3,
    });
  });

  it("validates query params and returns 400 for invalid values", async () => {
    const app = createApp();

    const response = await request(app)
      .get("/investigations/inventory-mismatch?periodDays=0&minimumAdjustmentCount=2")
      .set(ADMIN_HEADERS);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REQUEST");
  });

  it("filters by itemId", async () => {
    const app = createApp();

    const itemAResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-I-300",
      name: "Corner board",
      unit: "each",
      quantityOnHand: 10,
    });

    const itemBResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-I-400",
      name: "Tape gun",
      unit: "each",
      quantityOnHand: 10,
    });

    const itemAId = itemAResponse.body.id;
    const itemBId = itemBResponse.body.id;

    await request(app).post(`/items/${itemAId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -2,
      reasonCode: "DAMAGE",
    });
    await request(app).post(`/items/${itemAId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -1,
      reasonCode: "CYCLE_COUNT",
    });

    await request(app).post(`/items/${itemBId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -3,
      reasonCode: "DAMAGE",
    });
    await request(app).post(`/items/${itemBId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -1,
      reasonCode: "CYCLE_COUNT",
    });

    const response = await request(app)
      .get(
        `/investigations/inventory-mismatch?periodDays=30&minimumAdjustmentCount=2&itemId=${itemAId}`,
      )
      .set(ADMIN_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].itemId).toBe(itemAId);
  });

  it("filters by reasonCode", async () => {
    const app = createApp();

    const itemAResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-I-500",
      name: "Label roll",
      unit: "each",
      quantityOnHand: 20,
    });

    const itemBResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-I-600",
      name: "Shrink wrap",
      unit: "roll",
      quantityOnHand: 20,
    });

    const itemAId = itemAResponse.body.id;
    const itemBId = itemBResponse.body.id;

    await request(app).post(`/items/${itemAId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -4,
      reasonCode: "DAMAGE",
    });
    await request(app).post(`/items/${itemAId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -2,
      reasonCode: "DAMAGE",
    });

    await request(app).post(`/items/${itemBId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -2,
      reasonCode: "CYCLE_COUNT",
    });
    await request(app).post(`/items/${itemBId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -1,
      reasonCode: "CYCLE_COUNT",
    });

    const response = await request(app)
      .get(
        "/investigations/inventory-mismatch?periodDays=30&minimumAdjustmentCount=2&reasonCode=DAMAGE",
      )
      .set(ADMIN_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].itemId).toBe(itemAId);
    expect(response.body.items[0].reasonCodeBreakdown).toEqual({ DAMAGE: 2 });
  });

  it("filters by minimum investigation score", async () => {
    const app = createApp();

    const itemAResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-I-700",
      name: "Pallet tag",
      unit: "each",
      quantityOnHand: 30,
    });

    const itemBResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-I-800",
      name: "Void fill",
      unit: "bag",
      quantityOnHand: 30,
    });

    const itemAId = itemAResponse.body.id;
    const itemBId = itemBResponse.body.id;

    await request(app).post(`/items/${itemAId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -5,
      reasonCode: "DAMAGE",
    });
    await request(app).post(`/items/${itemAId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -3,
      reasonCode: "CYCLE_COUNT",
    });

    await request(app).post(`/items/${itemBId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: 1,
      reasonCode: "MANUAL_CORRECTION",
    });
    await request(app).post(`/items/${itemBId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: 1,
      reasonCode: "RECEIVING_CORRECTION",
    });

    const response = await request(app)
      .get(
        "/investigations/inventory-mismatch?periodDays=30&minimumAdjustmentCount=2&minInvestigationScore=10",
      )
      .set(ADMIN_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].itemId).toBe(itemAId);
    expect(response.body.items[0].investigationScore).toBeGreaterThanOrEqual(10);
  });
});
