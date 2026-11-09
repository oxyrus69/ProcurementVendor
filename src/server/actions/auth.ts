"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, profiles } from "@/server/db";
import { createSessionToken, SESSION_COOKIE } from "@/server/auth";
import { ROLE_HOME, type Role } from "@/lib/roles";

export async function loginAction(_prev: { error: string }, formData: FormData): Promise<{ error: string }> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Email dan kata sandi wajib diisi." };
  const [user] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Email atau kata sandi tidak valid." };
  const token = createSessionToken({ sub: user.id, email: user.email, fullName: user.fullName, role: user.role as Role, vendorId: user.vendorId });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  redirect(ROLE_HOME[user.role as Role]);
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
