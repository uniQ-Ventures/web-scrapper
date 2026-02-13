import { NextRequest } from "next/server";

/**
 * Founder OS JWT Verification Middleware
 *
 * Accepts Bearer tokens from the Founder OS Layer 1 orchestrator.
 * In production, this would verify the JWT signature against a
 * shared secret or JWKS endpoint. For now, it extracts the token
 * and passes through for development.
 */

interface FounderOSToken {
  sub: string;
  email: string;
  organizationId?: string;
  role?: string;
  iat: number;
  exp: number;
}

export function extractFounderOSToken(request: NextRequest): FounderOSToken | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.warn("[founder-os-jwt] Token expired");
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId || payload.org_id,
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    console.error("[founder-os-jwt] Failed to decode token");
    return null;
  }
}

export function requireAuth(request: NextRequest): FounderOSToken | null {
  return extractFounderOSToken(request);
}
