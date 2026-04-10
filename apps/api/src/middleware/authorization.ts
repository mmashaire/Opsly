import type { NextFunction, Request, Response } from "express";
import type { Role } from "@opsly/shared";

const allowedRoles = new Set<Role>(["admin", "viewer"]);

type AuthMode = "bearer-only" | "role-header";

function getAuthMode(): AuthMode {
  const configuredMode = process.env.OPSLY_AUTH_MODE?.trim().toLowerCase();

  if (configuredMode === "role-header") {
    return "role-header";
  }

  if (configuredMode === "bearer-only") {
    return "bearer-only";
  }

  if (process.env.NODE_ENV === "test") {
    return "role-header";
  }

  return "bearer-only";
}

function getConfiguredTokenRole(token: string): Role | undefined {
  const adminToken = process.env.OPSLY_ADMIN_TOKEN?.trim();
  const viewerToken = process.env.OPSLY_VIEWER_TOKEN?.trim();

  if (adminToken && token === adminToken) {
    return "admin";
  }

  if (viewerToken && token === viewerToken) {
    return "viewer";
  }

  return undefined;
}

function getRoleFromBearerToken(
  request: Request,
): { role: Role } | { error: { code: string; message: string } } | undefined {
  const authorizationHeader = request.header("authorization")?.trim();

  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, rawToken] = authorizationHeader.split(" ");

  if (scheme.toLowerCase() !== "bearer" || !rawToken) {
    return {
      error: {
        code: "INVALID_TOKEN",
        message: "Authorization header must use Bearer token format.",
      },
    };
  }

  const token = rawToken.trim();
  const role = getConfiguredTokenRole(token);

  if (!role) {
    return {
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid bearer token.",
      },
    };
  }

  return { role };
}

function getRoleFromHeader(request: Request): Role | undefined {
  const roleHeader = request.header("x-opsly-role")?.trim().toLowerCase();

  if (!roleHeader) {
    return undefined;
  }

  if (!allowedRoles.has(roleHeader as Role)) {
    return undefined;
  }

  return roleHeader as Role;
}

type AuthSource = "bearer" | "header" | "default";

export function resolveRoleMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const authMode = getAuthMode();
  const roleFromToken = getRoleFromBearerToken(request);

  if (roleFromToken && "error" in roleFromToken) {
    response.status(401).json({ error: roleFromToken.error });
    return;
  }

  const roleHeader = request.header("x-opsly-role")?.trim().toLowerCase();

  if (authMode === "bearer-only" && roleHeader) {
    response.status(400).json({
      error: {
        code: "AUTH_MODE_RESTRICTS_ROLE_HEADER",
        message: "x-opsly-role is disabled in bearer-only mode.",
      },
    });
    return;
  }

  if (
    authMode === "role-header" &&
    !roleFromToken &&
    roleHeader &&
    !allowedRoles.has(roleHeader as Role)
  ) {
    response.status(400).json({
      error: {
        code: "INVALID_ROLE",
        message: "Invalid role header. Allowed roles: admin, viewer.",
      },
    });
    return;
  }

  const roleFromHeader = authMode === "role-header" ? getRoleFromHeader(request) : undefined;

  const resolvedRole =
    (roleFromToken && "role" in roleFromToken ? roleFromToken.role : undefined) ??
    roleFromHeader ??
    "viewer";

  const authSource: AuthSource =
    roleFromToken && "role" in roleFromToken ? "bearer" : roleFromHeader ? "header" : "default";

  response.locals.role = resolvedRole;
  response.locals.authSource = authSource;
  response.setHeader("x-opsly-role", resolvedRole);
  response.setHeader("x-opsly-auth-source", authSource);

  next();
}

export function requireAdminRole(request: Request, response: Response, next: NextFunction): void {
  const role = (response.locals.role as Role | undefined) ?? getRoleFromHeader(request) ?? "viewer";

  if (role !== "admin") {
    response.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Admin role is required for this operation.",
      },
    });
    return;
  }

  next();
}
