import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/roles";

export const SESSION_COOKIE = "nexus_session";
const MAX_AGE = 60 * 60 * 8;

export interface Session {
  sub: string;
  email: string;
  fullName: string;
  role: Role;
  vendorId: string | null;
  exp: number;
}

function secret() {
  return process.env.SESSION_SECRET || "nexusprocure-local-development-secret-change-me";
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(session: Omit<Session, "exp">) {
  const payload = encode(JSON.stringify({ ...session, exp: Date.now() + MAX_AGE * 1000 }));
  return `${payload}.${signature(payload)}`;
}

export function verifySessionToken(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, supplied] = token.split(".");
  if (!payload || !supplied) return null;
  const expected = signature(payload);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (!session.exp || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getSession() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
