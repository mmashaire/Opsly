import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { clearItemStore, clearMovementStore } from "../src/data/store";
import { createApp } from "../src/index";

const ADMIN_HEADERS = { "x-opsly-role": "admin" };

describe("item updates", () => {
  beforeEach(() => {
    clearItemStore();
    clearMovementStore();
  });

  it("updates reorderThreshold for an existing item", async () => {
    const app = createApp();

    const createResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-U-100",
      name: "Edge board",
      unit: "each",
      quantityOnHand: 20,
    });

    const itemId = createResponse.body.id;

    const updateResponse = await request(app)
      .patch(`/items/${itemId}`)
      .set(ADMIN_HEADERS)
      .send({
        reorderThreshold: 7,
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      id: itemId,
      reorderThreshold: 7,
    });
  });

  it("clears reorderThreshold when null is provided", async () => {
    const app = createApp();

    const createResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-U-200",
      name: "Void fill",
      unit: "bag",
      quantityOnHand: 5,
      reorderThreshold: 4,
    });

    const itemId = createResponse.body.id;

    const updateResponse = await request(app)
      .patch(`/items/${itemId}`)
      .set(ADMIN_HEADERS)
      .send({
        reorderThreshold: null,
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.reorderThreshold).toBeUndefined();
  });

  it("returns 404 when updating a non-existent item", async () => {
    const app = createApp();

    const updateResponse = await request(app)
      .patch("/items/missing-item")
      .set(ADMIN_HEADERS)
      .send({
        reorderThreshold: 3,
      });

    expect(updateResponse.status).toBe(404);
    expect(updateResponse.body).toEqual({
      error: {
        code: "ITEM_NOT_FOUND",
        message: "Item not found.",
      },
    });
  });

  it("returns 400 for invalid update payload", async () => {
    const app = createApp();

    const createResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-U-300",
      name: "Shipping pouch",
      unit: "each",
      quantityOnHand: 2,
    });

    const itemId = createResponse.body.id;

    const updateResponse = await request(app)
      .patch(`/items/${itemId}`)
      .set(ADMIN_HEADERS)
      .send({
        reorderThreshold: -1,
      });

    expect(updateResponse.status).toBe(400);
    expect(updateResponse.body.error.code).toBe("INVALID_REQUEST");
  });

  it("changes low-stock alert eligibility after threshold update", async () => {
    const app = createApp();

    const createResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-U-400",
      name: "Packing peanuts",
      unit: "bag",
      quantityOnHand: 4,
    });

    const itemId = createResponse.body.id;

    const beforeUpdateAlerts = await request(app).get("/alerts/low-stock");
    expect(beforeUpdateAlerts.status).toBe(200);
    expect(beforeUpdateAlerts.body).toHaveLength(0);

    await request(app).patch(`/items/${itemId}`).set(ADMIN_HEADERS).send({
      reorderThreshold: 5,
    });

    const afterUpdateAlerts = await request(app).get("/alerts/low-stock");
    expect(afterUpdateAlerts.status).toBe(200);
    expect(afterUpdateAlerts.body).toHaveLength(1);
    expect(afterUpdateAlerts.body[0]).toMatchObject({
      id: itemId,
      quantityOnHand: 4,
      reorderThreshold: 5,
    });
  });
});
