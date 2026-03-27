import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { clearItemStore, clearMovementStore } from "../src/data/store";
import { createApp } from "../src/index";
const ADMIN_HEADERS = { "x-opsly-role": "admin" };
describe("item stock picks", () => {
  beforeEach(() => {
    clearItemStore();
    clearMovementStore();
  });
  it("applies a valid pick and appends a PICK movement", async () => {
    const app = createApp();
    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-P-100",
      name: "Shipping labels",
      unit: "roll",
      quantityOnHand: 20,
    });
    const itemId = itemResponse.body.id;
    const pickResponse = await request(app).post(`/items/${itemId}/picks`).set(ADMIN_HEADERS).send({
      quantityPicked: 6,
      note: "Wave 3 pick",
      performedBy: "picker_a",
      orderReference: "SO-9001",
    });
    expect(pickResponse.status).toBe(200);
    expect(pickResponse.body.item.quantityOnHand).toBe(14);
    expect(pickResponse.body.movement).toMatchObject({
      itemId,
      type: "PICK",
      delta: -6,
      quantityBefore: 20,
      quantityAfter: 14,
      note: "Wave 3 pick",
      performedBy: "picker_a",
      orderReference: "SO-9001",
    });
  });
  it("returns 400 for invalid pick payload", async () => {
    const app = createApp();
    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-P-200",
      name: "Carton",
      unit: "each",
      quantityOnHand: 5,
    });
    const itemId = itemResponse.body.id;
    const pickResponse = await request(app).post(`/items/${itemId}/picks`).set(ADMIN_HEADERS).send({
      quantityPicked: 0,
    });
    expect(pickResponse.status).toBe(400);
    expect(pickResponse.body.error.code).toBe("INVALID_REQUEST");
  });
  it("returns 400 when pick would reduce stock below zero", async () => {
    const app = createApp();
    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-P-300",
      name: "Corner protector",
      unit: "each",
      quantityOnHand: 3,
    });
    const itemId = itemResponse.body.id;
    const pickResponse = await request(app).post(`/items/${itemId}/picks`).set(ADMIN_HEADERS).send({
      quantityPicked: 4,
    });
    expect(pickResponse.status).toBe(400);
    expect(pickResponse.body).toMatchObject({
      error: {
        code: "INVALID_PICK",
        message: "Pick would reduce stock below zero.",
      },
    });
  });
  it("returns 404 when picking a non-existent item", async () => {
    const app = createApp();
    const pickResponse = await request(app)
      .post("/items/missing-item/picks")
      .set(ADMIN_HEADERS)
      .send({
        quantityPicked: 2,
      });
    expect(pickResponse.status).toBe(404);
    expect(pickResponse.body).toEqual({
      error: {
        code: "ITEM_NOT_FOUND",
        message: "Item not found.",
      },
    });
  });
});
