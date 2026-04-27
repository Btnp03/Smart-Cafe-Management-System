"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/pos-system/dashboard", label: "Dashboard" },
  { href: "/pos-system/pos", label: "POS" },
  { href: "/pos-system/orders", label: "Orders" },
];

export default function PosNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "block rounded-2xl border px-4 py-3 text-sm font-medium transition-all",
              isActive
                ? "border-slate-900 bg-slate-950 text-white shadow-[0_16px_35px_rgba(15,23,42,0.18)]"
                : "border-transparent bg-transparent text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
