import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearItemStore, clearMovementStore } from "../src/data/store";
import { listItems, listLowStockItems, getOperationsDashboardSummary } from "../src/domain/item";
import { seedDemoDataIfEnabled } from "../src/domain/demoSeed";

describe("demo seed", () => {
  const previousSeedFlag = process.env.OPSLY_SEED_DEMO_DATA;

  beforeEach(() => {
    clearItemStore();
    clearMovementStore();
    delete process.env.OPSLY_SEED_DEMO_DATA;
  });

  afterEach(() => {
    process.env.OPSLY_SEED_DEMO_DATA = previousSeedFlag;
  });

  it("does nothing when demo seeding is disabled", async () => {
    const result = await seedDemoDataIfEnabled();
    const items = await listItems();

    expect(result).toEqual({ seeded: false, itemCount: 0 });
    expect(items).toHaveLength(0);
  });

  it("seeds realistic warehouse data when enabled", async () => {
    process.env.OPSLY_SEED_DEMO_DATA = "true";

    const result = await seedDemoDataIfEnabled();
    const items = await listItems();
    const lowStockItems = await listLowStockItems();
    const dashboard = await getOperationsDashboardSummary({
      periodDays: 7,
      minimumAdjustmentCount: 2,
    });

    expect(result.seeded).toBe(true);
    expect(result.itemCount).toBe(5);
    expect(items).toHaveLength(5);
    expect(lowStockItems.length).toBeGreaterThan(0);
    expect(dashboard.inventory.totalItems).toBe(5);
    expect(dashboard.activity.receiptMovementCount).toBeGreaterThan(0);
    expect(dashboard.activity.pickMovementCount).toBeGreaterThan(0);
    expect(dashboard.activity.adjustmentMovementCount).toBeGreaterThan(0);
    expect(dashboard.investigation.candidateItemCount).toBeGreaterThan(0);
  });

  it("does not duplicate data when items already exist", async () => {
    process.env.OPSLY_SEED_DEMO_DATA = "true";

    await seedDemoDataIfEnabled();
    const secondResult = await seedDemoDataIfEnabled();
    const items = await listItems();

    expect(secondResult).toEqual({ seeded: false, itemCount: 5 });
    expect(items).toHaveLength(5);
  });
});
