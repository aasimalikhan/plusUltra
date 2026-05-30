"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/today", label: "Today" },
  { href: "/cursor", label: "Cursor" },
  { href: "/rules", label: "Rules" },
  { href: "/goals", label: "Goals" },
  { href: "/history", label: "History" },
];

export function TopNav({ email }: { email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-bg-border bg-bg/85 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/today"
          className="text-sm font-semibold tracking-tight text-fg"
        >
          plusUltra
        </Link>
        <button
          onClick={signOut}
          className="text-xs text-fg-subtle transition-colors hover:text-fg"
        >
          {email ? "Sign out" : ""}
        </button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 sm:px-4">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-bg-subtle text-fg"
                  : "text-fg-subtle hover:bg-bg-subtle hover:text-fg",
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
