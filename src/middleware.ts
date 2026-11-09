import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROLE_HOME, type Role } from "@/lib/roles";
import { allowedForPath } from "@/lib/access";

const COOKIE = "nexus_session";

async function verify(token: string | undefined) {
  if (!token) return null;
  const [payload, supplied] = token.split(".");
  if (!payload || !supplied) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.SESSION_SECRET || "nexusprocure-local-development-secret-change-me"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signature = Uint8Array.from(atob(supplied.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(payload));
  if (!valid) return null;
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const session = JSON.parse(atob(normalized)) as { role: Role; exp: number };
  if (session.exp < Date.now()) return null;
  return session;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verify(req.cookies.get(COOKIE)?.value);
  if (pathname === "/login") {
    return session ? NextResponse.redirect(new URL(ROLE_HOME[session.role], req.url)) : NextResponse.next();
  }
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (pathname === "/") return NextResponse.redirect(new URL(ROLE_HOME[session.role], req.url));
  if (!allowedForPath(pathname, session.role)) return NextResponse.redirect(new URL(ROLE_HOME[session.role], req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|static|.*\\..*).*)"] };
