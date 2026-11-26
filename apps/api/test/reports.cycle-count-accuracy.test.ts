import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { addMovementRecord, clearItemStore, clearMovementStore } from "../src/data/store";
import { createApp } from "../src/index";

const ADMIN_HEADERS = { "x-opsly-role": "admin" };
const VIEWER_HEADERS = { "x-opsly-role": "viewer" };

describe("cycle count accuracy report", () => {
  beforeEach(() => {
    clearItemStore();
    clearMovementStore();
  });

  it("reports exact counts and item-level shortage and surplus variance", async () => {
    const app = createApp();
    const itemAResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-CC-REPORT-100",
      name: "Carton",
      unit: "each",
      quantityOnHand: 10,
    });
    const itemBResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-CC-REPORT-200",
      name: "Tape",
      unit: "roll",
      quantityOnHand: 5,
    });
    const itemAId = itemAResponse.body.id;
    const itemBId = itemBResponse.body.id;

    await request(app)
      .post(`/items/${itemAId}/cycle-counts`)
      .set(ADMIN_HEADERS)
      .send({ countedQuantity: 10 });
    await request(app)
      .post(`/items/${itemAId}/cycle-counts`)
      .set(ADMIN_HEADERS)
      .send({ countedQuantity: 7 });
    await request(app)
      .post(`/items/${itemAId}/cycle-counts`)
      .set(ADMIN_HEADERS)
      .send({ countedQuantity: 9 });
    await request(app)
      .post(`/items/${itemAId}/adjustments`)
      .set(ADMIN_HEADERS)
      .send({ delta: -1, reasonCode: "CYCLE_COUNT" });
    await request(app)
      .post(`/items/${itemBId}/cycle-counts`)
      .set(ADMIN_HEADERS)
      .send({ countedQuantity: 3 });

    const response = await request(app)
      .get("/reports/cycle-count-accuracy?periodDays=30")
      .set(ADMIN_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      periodDays: 30,
      totalCountCount: 4,
      exactCountCount: 1,
      varianceCount: 3,
      accuracyPercent: 25,
      itemsCounted: 2,
      shortageUnits: 5,
      surplusUnits: 2,
      absoluteVarianceUnits: 7,
    });
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0]).toMatchObject({
      itemId: itemAId,
      countCount: 3,
      exactCountCount: 1,
      varianceCount: 2,
      accuracyPercent: 33.3,
      shortageUnits: 3,
      surplusUnits: 2,
      absoluteVarianceUnits: 5,
    });
    expect(response.body.items[1]).toMatchObject({
      itemId: itemBId,
      countCount: 1,
      exactCountCount: 0,
      varianceCount: 1,
      accuracyPercent: 0,
      shortageUnits: 2,
      surplusUnits: 0,
      absoluteVarianceUnits: 2,
    });
  });

  it("returns no accuracy percentage when no physical counts exist", async () => {
    const app = createApp();

    const response = await request(app).get("/reports/cycle-count-accuracy").set(ADMIN_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      totalCountCount: 0,
      exactCountCount: 0,
      varianceCount: 0,
      accuracyPercent: null,
      itemsCounted: 0,
      shortageUnits: 0,
      surplusUnits: 0,
      absoluteVarianceUnits: 0,
      items: [],
    });
  });

  it("includes only counts inside the requested reporting period", async () => {
    const app = createApp();
    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-CC-REPORT-300",
      name: "Void fill",
      unit: "bag",
      quantityOnHand: 10,
    });
    const itemId = itemResponse.body.id;
    const now = Date.now();

    await addMovementRecord({
      id: "count-outside-period",
      itemId,
      type: "CYCLE_COUNT",
      delta: -4,
      quantityBefore: 10,
      quantityAfter: 6,
      reasonCode: "CYCLE_COUNT",
      createdAt: new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await addMovementRecord({
      id: "count-inside-period",
      itemId,
      type: "CYCLE_COUNT",
      delta: -2,
      quantityBefore: 6,
      quantityAfter: 4,
      reasonCode: "CYCLE_COUNT",
      createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await addMovementRecord({
      id: "count-in-future",
      itemId,
      type: "CYCLE_COUNT",
      delta: -3,
      quantityBefore: 4,
      quantityAfter: 1,
      reasonCode: "CYCLE_COUNT",
      createdAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    });

    const response = await request(app)
      .get("/reports/cycle-count-accuracy?periodDays=30")
      .set(ADMIN_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body.totalCountCount).toBe(1);
    expect(response.body.shortageUnits).toBe(2);
    expect(response.body.items[0].latestCountAt).toBe(
      new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
    );
  });

  it("validates the period and restricts the report to admins", async () => {
    const app = createApp();

    const invalidPeriodResponse = await request(app)
      .get("/reports/cycle-count-accuracy?periodDays=366")
      .set(ADMIN_HEADERS);
    const viewerResponse = await request(app)
      .get("/reports/cycle-count-accuracy")
      .set(VIEWER_HEADERS);

    expect(invalidPeriodResponse.status).toBe(400);
    expect(invalidPeriodResponse.body.error.code).toBe("INVALID_REQUEST");
    expect(viewerResponse.status).toBe(403);
  });
});
