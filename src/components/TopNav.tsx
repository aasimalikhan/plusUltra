"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/today", label: "Today" },
  { href: "/deadlines", label: "Deadlines" },
  { href: "/attack-mode", label: "Attack" },
  { href: "/journal", label: "Journal" },
  { href: "/cursor", label: "Analysis" },
  { href: "/manage", label: "Manage" },
  { href: "/insights", label: "Insights" },
  { href: "/rules", label: "Rules" },
  { href: "/goals", label: "Goals" },
  { href: "/history", label: "History" },
];

export function TopNav({ username }: { username: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-bg-border/80 bg-bg/90 shadow-[0_1px_0_hsl(0_0%_100%/0.03)] backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <BrandLogo />
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-xs text-fg-subtle transition-colors hover:text-fg"
          >
            {username} · Sign out
          </button>
        </form>
      </div>
      <nav className="flex gap-0.5 overflow-x-auto px-2 pb-2.5 sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-fg text-bg"
                  : "text-fg-muted hover:bg-bg-subtle hover:text-fg",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
