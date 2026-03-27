import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestContextMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const incomingRequestId = request.header("x-request-id")?.trim();
  const requestId = incomingRequestId || randomUUID();
  const startedAt = process.hrtime.bigint();

  response.setHeader("x-request-id", requestId);
  response.locals.requestId = requestId;

  response.on("finish", () => {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    console.info(
      JSON.stringify({
        event: "http_request",
        requestId,
        role: response.locals.role || "viewer",
        authSource: response.locals.authSource || "default",
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      }),
    );
  });

  next();
}
