import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { clearItemStore, clearMovementStore } from "../src/data/store";
import { createApp } from "../src/index";
const ADMIN_HEADERS = { "x-opsly-role": "admin" };
describe("item audit endpoint", () => {
  beforeEach(() => {
    clearItemStore();
    clearMovementStore();
  });
  it("returns latest audit events in descending time order", async () => {
    const app = createApp();
    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-A-100",
      name: "Audit box",
      unit: "each",
      quantityOnHand: 10,
    });
    const itemId = itemResponse.body.id;
    await request(app).post(`/items/${itemId}/receipts`).set(ADMIN_HEADERS).send({
      quantityReceived: 5,
      supplierReference: "ASN-777",
      performedBy: "receiver_1",
    });
    await request(app).post(`/items/${itemId}/picks`).set(ADMIN_HEADERS).send({
      quantityPicked: 2,
      orderReference: "SO-777",
      performedBy: "picker_1",
    });
    await request(app).post(`/items/${itemId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -1,
      reasonCode: "CYCLE_COUNT",
      performedBy: "lead_1",
    });
    const response = await request(app).get(`/items/${itemId}/audit`).set(ADMIN_HEADERS);
    expect(response.status).toBe(200);
    expect(response.body.itemId).toBe(itemId);
    expect(response.body.events).toHaveLength(3);
    expect(response.body.events[0]).toMatchObject({
      type: "ADJUSTMENT",
      delta: -1,
      reasonCode: "CYCLE_COUNT",
      performedBy: "lead_1",
    });
    expect(response.body.events[1]).toMatchObject({
      type: "PICK",
      delta: -2,
      orderReference: "SO-777",
      performedBy: "picker_1",
    });
    expect(response.body.events[2]).toMatchObject({
      type: "RECEIPT",
      delta: 5,
      supplierReference: "ASN-777",
      performedBy: "receiver_1",
    });
  });
  it("supports limit and before cursor", async () => {
    const app = createApp();
    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-A-200",
      name: "Audit tote",
      unit: "each",
      quantityOnHand: 20,
    });
    const itemId = itemResponse.body.id;
    await request(app).post(`/items/${itemId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: 2,
      reasonCode: "MANUAL_CORRECTION",
    });
    await request(app).post(`/items/${itemId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: -3,
      reasonCode: "DAMAGE",
    });
    await request(app).post(`/items/${itemId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: 1,
      reasonCode: "RECEIVING_CORRECTION",
    });
    const pageOne = await request(app).get(`/items/${itemId}/audit?limit=2`).set(ADMIN_HEADERS);
    expect(pageOne.status).toBe(200);
    expect(pageOne.body.events).toHaveLength(2);
    expect(pageOne.body.hasMore).toBe(true);
    expect(typeof pageOne.body.nextBefore).toBe("string");
    const before = pageOne.body.nextBefore;
    const pageTwo = await request(app)
      .get(`/items/${itemId}/audit?limit=2&before=${encodeURIComponent(before)}`)
      .set(ADMIN_HEADERS);
    expect(pageTwo.status).toBe(200);
    expect(pageTwo.body.events).toHaveLength(1);
    expect(pageTwo.body.hasMore).toBe(false);
    expect(pageTwo.body.nextBefore).toBeUndefined();
  });
  it("returns hasMore false and no nextBefore when results do not exceed limit", async () => {
    const app = createApp();
    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-A-250",
      name: "Audit sleeve",
      unit: "each",
      quantityOnHand: 5,
    });
    const itemId = itemResponse.body.id;
    await request(app).post(`/items/${itemId}/adjustments`).set(ADMIN_HEADERS).send({
      delta: 1,
      reasonCode: "MANUAL_CORRECTION",
    });
    const response = await request(app).get(`/items/${itemId}/audit?limit=5`).set(ADMIN_HEADERS);
    expect(response.status).toBe(200);
    expect(response.body.events).toHaveLength(1);
    expect(response.body.hasMore).toBe(false);
    expect(response.body.nextBefore).toBeUndefined();
  });
  it("returns 400 for invalid query params", async () => {
    const app = createApp();
    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-A-300",
      name: "Audit tape",
      unit: "roll",
      quantityOnHand: 10,
    });
    const itemId = itemResponse.body.id;
    const response = await request(app).get(`/items/${itemId}/audit?limit=0`).set(ADMIN_HEADERS);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REQUEST");
  });
});
