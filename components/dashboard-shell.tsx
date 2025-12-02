// components/dashboard-shell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavTab({
  href,
  label
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const isActive =
    (href === "/" && pathname === "/") ||
    (href !== "/" && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      className={`text-xs px-3 py-1.5 rounded-full border transition ${
        isActive
          ? "border-indigo-400 bg-indigo-500/10 text-indigo-200"
          : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-100"
      }`}
    >
      {label}
    </Link>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold tracking-tight text-slate-100">
              ApexMetrics
            </span>
            <span className="text-xs text-slate-400">
              Demo environment
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <NavTab href="/" label="Dashboard" />
            <NavTab href="/analytics" label="Analytics" />
            <NavTab href="/coaching" label="Coaching" />
          </div>
        </div>
      </div>
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
