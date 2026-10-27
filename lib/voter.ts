import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

// Anonymous voter identity: a random id in a signed, httpOnly cookie. The server
// issues it, so clients can't mint new identities by sending arbitrary strings.

export const VOTER_COOKIE = "ma_voter";
const ONE_YEAR = 60 * 60 * 24 * 365;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required");
    }
    return "dev-only-voter-secret";
  }
  return secret;
}

function hmac(purpose: string, value: string): string {
  return createHmac("sha256", getSecret()).update(`${purpose}:${value}`).digest("hex");
}

function sign(id: string): string {
  return `${id}.${hmac("voter", id).slice(0, 32)}`;
}

function verify(cookie: string | undefined): string | null {
  if (!cookie) return null;
  const dot = cookie.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = cookie.slice(0, dot);
  const expected = Buffer.from(sign(id));
  const actual = Buffer.from(cookie);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return id;
}

/** Returns the verified voter id, or a new one that the caller must set via setVoterCookie. */
export function getVoterId(req: NextRequest): { voterId: string; isNew: boolean } {
  const existing = verify(req.cookies.get(VOTER_COOKIE)?.value);
  if (existing) return { voterId: existing, isNew: false };
  return { voterId: randomUUID(), isNew: true };
}

export function setVoterCookie(res: NextResponse, voterId: string) {
  res.cookies.set(VOTER_COOKIE, sign(voterId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

/** Stored in Vote.fingerprint; derived so the raw cookie id never sits in the DB. */
export function voterKey(voterId: string): string {
  return hmac("voter-key", voterId).slice(0, 32);
}

/** Keyed hash: unlike plain SHA-256, can't be reversed by hashing all IPv4 addresses. */
export function hashIp(ip: string): string {
  return hmac("ip", ip).slice(0, 32);
}

/** Basic CSRF guard: browsers send Origin on cross-site POST/DELETE. */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
