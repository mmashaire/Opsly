import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { clearItemStore, clearMovementStore } from "../src/data/store";
import { createApp } from "../src/index";

const ADMIN_HEADERS = { "x-opsly-role": "admin" };

describe("operations dashboard summary", () => {
  beforeEach(() => {
    clearItemStore();
    clearMovementStore();
  });

  it("returns inventory, activity, and investigation metrics", async () => {
    const app = createApp();

    const itemAResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-D-100",
      name: "Dock label",
      unit: "each",
      quantityOnHand: 10,
      reorderThreshold: 12,
    });

    const itemBResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-D-200",
      name: "Strap",
      unit: "each",
      quantityOnHand: 0,
      reorderThreshold: 3,
    });

    const itemAId = itemAResponse.body.id;
    const itemBId = itemBResponse.body.id;

    await request(app).post(`/items/${itemAId}/receipts`).set(ADMIN_HEADERS).send({
      quantityReceived: 5,
      supplierReference: "ASN-991",
    });

    await request(app).post(`/items/${itemAId}/picks`).set(ADMIN_HEADERS).send({
      quantityPicked: 3,
      orderReference: "SO-991",
    });

    await request(app).post(`/items/${itemAId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -2,
      reasonCode: "DAMAGE",
    });

    await request(app).post(`/items/${itemAId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -1,
      reasonCode: "CYCLE_COUNT",
    });

    await request(app).post(`/items/${itemBId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: 1,
      reasonCode: "MANUAL_CORRECTION",
    });

    const response = await request(app)
      .get("/dashboard/operations-summary?periodDays=7&minimumAdjustmentCount=2")
      .set(ADMIN_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body.periodDays).toBe(7);
    expect(response.body.minimumAdjustmentCount).toBe(2);
    expect(response.body.inventory).toEqual({
      totalItems: 2,
      totalQuantityOnHand: 10,
      lowStockItemCount: 2,
      outOfStockItemCount: 0,
    });
    expect(response.body.activity).toEqual({
      receiptMovementCount: 1,
      pickMovementCount: 1,
      adjustmentMovementCount: 3,
      unitsReceived: 5,
      unitsPicked: 3,
      netStockChange: 0,
    });
    expect(response.body.investigation).toEqual({
      candidateItemCount: 1,
    });
  });

  it("supports empty activity with defaults", async () => {
    const app = createApp();

    const response = await request(app).get("/dashboard/operations-summary").set(ADMIN_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body.periodDays).toBe(1);
    expect(response.body.minimumAdjustmentCount).toBe(2);
    expect(response.body.inventory).toEqual({
      totalItems: 0,
      totalQuantityOnHand: 0,
      lowStockItemCount: 0,
      outOfStockItemCount: 0,
    });
    expect(response.body.activity).toEqual({
      receiptMovementCount: 0,
      pickMovementCount: 0,
      adjustmentMovementCount: 0,
      unitsReceived: 0,
      unitsPicked: 0,
      netStockChange: 0,
    });
    expect(response.body.investigation).toEqual({
      candidateItemCount: 0,
    });
  });

  it("returns 400 for invalid query params", async () => {
    const app = createApp();

    const response = await request(app)
      .get("/dashboard/operations-summary?periodDays=0&minimumAdjustmentCount=2")
      .set(ADMIN_HEADERS);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REQUEST");
  });
});
