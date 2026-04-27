import { supabase } from "@/lib/supabase";

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="border-b border-slate-300/80 bg-white/75 px-6 py-5 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Point of sale
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Coop POS Dashboard
            </p>
          </div>

          <div className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            {user?.email ?? "No active user"}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <div className="rounded-[32px] border border-slate-300 bg-white/88 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
