"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, GraduationCap, Settings, Users, UsersRound, type LucideIcon } from "lucide-react";
import type { MenuIcon, MenuItem } from "@/lib/permissions";

const ICONS: Record<MenuIcon, LucideIcon> = {
  learner: GraduationCap,
  courses: BookOpen,
  learners: Users,
  groups: UsersRound,
  settings: Settings,
};

// Menu latéral. L'élément actif est repéré par la couleur de l'organisme (variable --brand).
export function SidebarNav({ items }: { items: MenuItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation principale" className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-[color-mix(in_srgb,var(--brand)_12%,white)] font-semibold text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            {active && (
              <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-full bg-[var(--brand)]" />
            )}
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
