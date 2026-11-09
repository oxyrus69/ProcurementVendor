import { requireUser } from "@/server/auth";
import type { Session } from "@/server/auth";
import type { Role } from "@/lib/roles";

export { ACCESS_RULES, allowedForPath } from "@/lib/access";

export async function requireRole(allowed: Role[]): Promise<Session> {
  const session = await requireUser();
  if (!allowed.includes(session.role)) throw new Error("Forbidden: role tidak memiliki akses.");
  return session;
}
