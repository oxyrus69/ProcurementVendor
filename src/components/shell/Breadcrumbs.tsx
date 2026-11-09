"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { BREADCRUMB_LABELS } from "./navigation";

function labelFor(segment: string): string {
  if (BREADCRUMB_LABELS[segment]) return BREADCRUMB_LABELS[segment];
  if (/^[0-9a-f]{8}-/i.test(segment)) return `#${segment.slice(0, 8)}`;
  return segment.replaceAll("-", " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Breadcrumb dinamis dari path aktif (Zona B). */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const trail = [{ href: "/", label: "Nexus Manufacturing" }, ...segments.map((segment, index) => ({ href: `/${segments.slice(0, index + 1).join("/")}`, label: labelFor(segment) }))];
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-xs text-slate-400 lg:flex">
      {trail.map((item, index) => {
        const last = index === trail.length - 1;
        return (
          <span key={item.href} className="flex min-w-0 items-center gap-1.5">
            {index > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden="true" />}
            {last
              ? <span className="truncate font-medium text-slate-600">{item.label}</span>
              : <Link href={item.href} className="truncate transition-colors hover:text-slate-700">{item.label}</Link>}
          </span>
        );
      })}
    </nav>
  );
}
