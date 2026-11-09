import { getSession } from "@/server/auth";
import { logoutAction } from "@/server/actions/auth";
import { allowedForPath } from "@/lib/access";
import { getShellStats } from "@/server/services/shellStats";
import { APP_NAVIGATION, type AppNavigationItem } from "./navigation";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { MobileNav } from "@/components/ui/MobileNav";
import { Breadcrumbs } from "./Breadcrumbs";
import { LogOut, Bell } from "lucide-react";

async function resolveNav() {
  const session = await getSession();
  if (!session) return { session: null, items: [] as AppNavigationItem[], alerts: 0 };
  const stats = await getShellStats();
  const items = APP_NAVIGATION.filter((item) => allowedForPath(item.href, session.role)).map((item) => {
    const value = item.badgeKey ? stats[item.badgeKey] : undefined;
    return { ...item, badge: value && value > 0 ? value : undefined };
  });
  return { session, items, alerts: stats.invoiceHolds + stats.pendingApprovals };
}

export async function Topbar() {
  const { session, items, alerts } = await resolveNav();
  return (
    <header className="sticky top-0 z-30 flex min-h-12 items-center gap-2 border-b border-[var(--border)] bg-white/95 px-3 py-2 backdrop-blur sm:gap-3 sm:px-6">
      <MobileNav items={items} />
      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-2">
        <CommandPalette items={items} />
        <span className="hidden items-center gap-1.5 rounded-md border border-[var(--border)] px-2 py-1.5 text-[11px] text-slate-500 xl:inline-flex">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />Sinkron
        </span>
        <button
          className="relative rounded-md border border-[var(--border)] bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
          aria-label={`Notifikasi${alerts ? `, ${alerts} perlu tindakan` : ""}`}
        >
          <Bell className="size-4" aria-hidden="true" />
          {alerts > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-amber-500 px-1 font-mono text-[9px] font-bold leading-4 text-white">{alerts}</span>}
        </button>
        {session && (
          <form action={logoutAction}>
            <button
              className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-red-700"
              title={`Keluar dari ${session.email}`}
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
