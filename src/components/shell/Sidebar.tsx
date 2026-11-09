import { getSession } from "@/server/auth";
import { allowedForPath } from "@/lib/access";
import { getShellStats } from "@/server/services/shellStats";
import { APP_NAVIGATION, type AppNavigationItem } from "./navigation";
import { SidebarNav } from "./SidebarNav";
import { Database, ChevronsUpDown } from "lucide-react";

function withBadges(items: AppNavigationItem[], stats: Awaited<ReturnType<typeof getShellStats>>): AppNavigationItem[] {
  return items.map((item) => {
    const value = item.badgeKey ? stats[item.badgeKey] : undefined;
    return { ...item, badge: value && value > 0 ? value : undefined };
  });
}

export async function Sidebar() {
  const session = await getSession();
  const stats = session ? await getShellStats() : null;
  const items = session && stats
    ? withBadges(APP_NAVIGATION.filter((item) => allowedForPath(item.href, session.role)), stats)
    : [];
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-slate-950 text-slate-300 md:flex">
      <div className="border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-blue-600 font-mono text-sm font-bold text-white">N</div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight text-white">NexusProcure</div>
            <div className="text-[10px] text-slate-500">Source-to-Pay Console</div>
          </div>
        </div>
      </div>

      <div className="mx-3 mt-3 flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs text-slate-400">
        <span className="min-w-0">
          <span className="block truncate font-medium text-slate-200">Nexus Manufacturing</span>
          <span className="text-[10px] text-slate-500">Production workspace</span>
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0" aria-hidden="true" />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <SidebarNav items={items} />
      </div>

      <div className="border-t border-slate-800 p-3">
        <div className="mb-3 flex items-center gap-2 px-2 text-[11px] text-slate-500">
          <Database className="size-3.5 text-emerald-400" aria-hidden="true" />
          <span>Basis data online</span>
          <span className="ml-auto font-mono text-[10px] text-slate-600">PGlite</span>
        </div>
        {session && (
          <div className="flex items-center gap-2.5 rounded-md bg-slate-900 p-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded bg-slate-700 text-xs font-semibold text-white">{session.fullName.slice(0, 1)}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-slate-200">{session.fullName}</div>
              <div className="truncate font-mono text-[9px] text-slate-500">{session.role}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
