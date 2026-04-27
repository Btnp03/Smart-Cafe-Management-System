"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "@/lib/supabase";

type RootShellProps = {
  children: React.ReactNode;
};

const primaryItems = [
  { href: "/dashboard", label: "Overview", meta: "Workspace home" },
  { href: "/select-branch", label: "Branches", meta: "Choose active branch" },
];

const posItems = [
  { href: "/pos-system/dashboard", label: "Dashboard" },
  { href: "/pos-system/pos", label: "POS" },
  { href: "/pos-system/orders", label: "Orders" },
];

const systemItems = [
  { href: "/menu-system/show-menu", label: "Menu", meta: "Catalog control" },
  { href: "/kitchen-system/kitchen", label: "Kitchen", meta: "Live queue" },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  meta,
  pathname,
}: {
  href: string;
  label: string;
  meta: string;
  pathname: string;
}) {
  const isActive = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      className={[
        "group flex items-center justify-between rounded-2xl border px-4 py-3 transition-all",
        isActive
          ? "border-white/20 bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/6 hover:text-white",
      ].join(" ")}
    >
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs text-slate-500 group-hover:text-slate-400">
          {meta}
        </p>
      </div>
      <span
        className={[
          "h-2.5 w-2.5 rounded-full transition-colors",
          isActive ? "bg-slate-200" : "bg-slate-700 group-hover:bg-slate-500",
        ].join(" ")}
      />
    </Link>
  );
}

function PosDropdown({ pathname }: { pathname: string }) {
  const isPosRoute = pathname.startsWith("/pos-system");
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const isOpen = manualOpen ?? isPosRoute;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setManualOpen(!isOpen)}
        className={[
          "group flex w-full items-center justify-between rounded-[28px] border px-5 py-4 text-left transition-all",
          isPosRoute
            ? "border-white/25 bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            : "border-white/10 bg-white/[0.03] text-slate-100 hover:border-white/15 hover:bg-white/[0.06]",
        ].join(" ")}
      >
        <div>
          <p className="text-sm font-semibold">POS</p>
          <p className="mt-1 text-xs text-slate-400">Sales and orders</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={[
              "h-3 w-3 rounded-full",
              isPosRoute ? "bg-slate-200" : "bg-slate-500",
            ].join(" ")}
          />
          <span className="text-lg text-slate-400">{isOpen ? "-" : "+"}</span>
        </div>
      </button>

      {isOpen ? (
        <div className="space-y-2 rounded-[28px] border border-white/10 bg-black/10 p-4">
          {posItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "block rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-white text-slate-950 shadow-[0_14px_35px_rgba(15,23,42,0.2)]"
                    : "text-slate-300 hover:bg-white/8 hover:text-white",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function RootShell({ children }: RootShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isPlainPage = pathname === "/login" || pathname === "/register";
  const isProtectedRoute = !isPlainPage;

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user && isProtectedRoute) {
      const nextPath =
        pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${nextPath}`);
      return;
    }

    if (user && isPlainPage) {
      router.replace("/dashboard");
    }
  }, [isPlainPage, isProtectedRoute, loading, pathname, router, user]);

  if (loading && isProtectedRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#0f172a_0%,#111827_38%,#1f2937_100%)] px-6 text-slate-100">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.05] px-8 py-6 text-center shadow-[0_30px_80px_rgba(15,23,42,0.3)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            Smart Cafe
          </p>
          <p className="mt-3 text-lg font-semibold text-white">Checking session...</p>
        </div>
      </div>
    );
  }

  if (isPlainPage) {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#0f172a_0%,#111827_38%,#1f2937_100%)] px-6 text-slate-100">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.05] px-8 py-6 text-center shadow-[0_30px_80px_rgba(15,23,42,0.3)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            Smart Cafe
          </p>
          <p className="mt-3 text-lg font-semibold text-white">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
    setIsLoggingOut(false);
  }

  return (
    <div className="flex min-h-screen bg-transparent text-slate-100">
      <aside className="sticky top-0 hidden h-screen w-80 shrink-0 overflow-y-auto border-r border-black/10 bg-[linear-gradient(180deg,#0f172a_0%,#111827_38%,#1f2937_100%)] p-6 lg:block">
        <div className="flex h-full flex-col">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-sm font-semibold tracking-[0.22em] text-slate-200">
                SC
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight text-white">
                  Smart Cafe
                </p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  SaaS workspace
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Workspace
              </p>
              <p className="mt-2 text-sm font-medium text-slate-100">
                Operations control center
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-8">
            <section className="space-y-3">
              <p className="px-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Main
              </p>
              {primaryItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  meta={item.meta}
                  pathname={pathname}
                />
              ))}
            </section>

            <section className="space-y-3">
              <p className="px-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Systems
              </p>
              <PosDropdown pathname={pathname} />
              {systemItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  meta={item.meta}
                  pathname={pathname}
                />
              ))}
            </section>
          </div>

          <div className="mt-auto rounded-[28px] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Active profile
            </p>
            <p className="mt-3 text-base font-semibold text-white">
              {loading ? "Loading..." : user?.name || "Guest"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {loading ? "Checking session" : user?.email || "Not signed in"}
            </p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-300">
              Branch: {user?.branch?.branch_name || "Not selected"}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="mt-4 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-screen flex-1 text-slate-900">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.95),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
          {children}
        </div>
      </div>
    </div>
  );
}
