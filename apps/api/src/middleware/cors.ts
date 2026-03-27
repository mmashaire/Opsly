import type { NextFunction, Request, Response } from "express";

const allowedMethods = ["GET", "POST", "PATCH", "OPTIONS"];
const allowedHeaders = ["authorization", "content-type", "x-request-id", "x-opsly-role"];

function getAllowedOrigins(): string[] {
  const configuredOrigins = process.env.OPSLY_ALLOWED_ORIGINS;

  if (!configuredOrigins) {
    return [];
  }

  return configuredOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function corsMiddleware(request: Request, response: Response, next: NextFunction): void {
  const origin = request.header("origin")?.trim();

  if (!origin) {
    next();
    return;
  }

  const allowedOrigins = getAllowedOrigins();

  if (!allowedOrigins.includes(origin)) {
    response.status(403).json({
      error: {
        code: "CORS_ORIGIN_FORBIDDEN",
        message: "Request origin is not allowed.",
      },
    });
    return;
  }

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", allowedMethods.join(", "));
  response.setHeader("Access-Control-Allow-Headers", allowedHeaders.join(", "));

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  next();
}
