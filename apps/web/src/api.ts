import type {
  AdjustmentReasonCode,
  CreateStockAdjustmentInput,
  CreateStockPickInput,
  CreateStockReceiptInput,
  InventoryInvestigationSummary,
  Item,
  ItemAuditResponse,
  OperationsDashboardSummary,
  StockMovement,
} from "@opsly/shared";

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "http://localhost:3000";
const apiRole = (import.meta.env.VITE_API_ROLE as string | undefined)?.trim();
const apiToken = (import.meta.env.VITE_API_TOKEN as string | undefined)?.trim();

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {};

  if (apiToken) {
    headers.authorization = `Bearer ${apiToken}`;
  } else if (apiRole) {
    headers["x-opsly-role"] = apiRole;
  }

  return headers;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as ApiErrorPayload | undefined;
    const message = payload?.error?.message || `Request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      ...buildHeaders(),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as ApiErrorPayload | undefined;
    const message = payload?.error?.message || `Request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return (await response.json()) as T;
}

interface StockActionResult {
  item: Item;
  movement: StockMovement;
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export function getConfiguredAuthMode(): "bearer" | "role-header" | "anonymous" {
  if (apiToken) {
    return "bearer";
  }

  if (apiRole) {
    return "role-header";
  }

  return "anonymous";
}

export async function fetchDashboardSummary(): Promise<OperationsDashboardSummary> {
  return fetchJson<OperationsDashboardSummary>(
    "/dashboard/operations-summary?periodDays=7&minimumAdjustmentCount=2",
  );
}

export async function fetchLowStockItems(): Promise<Item[]> {
  return fetchJson<Item[]>("/alerts/low-stock");
}

export async function fetchItems(): Promise<Item[]> {
  return fetchJson<Item[]>("/items");
}

export async function fetchInvestigationSummary(): Promise<InventoryInvestigationSummary> {
  return fetchJson<InventoryInvestigationSummary>(
    "/investigations/inventory-mismatch?periodDays=30&minimumAdjustmentCount=2",
  );
}

export async function fetchItemById(itemId: string): Promise<Item> {
  return fetchJson<Item>(`/items/${encodeURIComponent(itemId)}`);
}

export async function fetchItemMovements(itemId: string): Promise<StockMovement[]> {
  return fetchJson<StockMovement[]>(`/items/${encodeURIComponent(itemId)}/movements`);
}

export async function fetchItemAudit(
  itemId: string,
  limit = 20,
  before?: string,
): Promise<ItemAuditResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) {
    params.append("before", before);
  }
  return fetchJson<ItemAuditResponse>(
    `/items/${encodeURIComponent(itemId)}/audit?${params.toString()}`,
  );
}

export async function createStockReceipt(
  itemId: string,
  input: Omit<CreateStockReceiptInput, "itemId">,
): Promise<StockActionResult> {
  return postJson<StockActionResult>(`/items/${encodeURIComponent(itemId)}/receipts`, input);
}

export async function createStockPick(
  itemId: string,
  input: Omit<CreateStockPickInput, "itemId">,
): Promise<StockActionResult> {
  return postJson<StockActionResult>(`/items/${encodeURIComponent(itemId)}/picks`, input);
}

export async function createStockAdjustment(
  itemId: string,
  input: Omit<CreateStockAdjustmentInput, "itemId"> & { reasonCode: AdjustmentReasonCode },
): Promise<StockActionResult> {
  return postJson<StockActionResult>(`/items/${encodeURIComponent(itemId)}/adjustments`, input);
}
