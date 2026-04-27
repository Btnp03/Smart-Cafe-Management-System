import Link from "next/link";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  footerText: string;
  footerLinkLabel: string;
  footerLinkHref: string;
  children: React.ReactNode;
};

export default function AuthShell({
  eyebrow,
  title,
  description,
  footerText,
  footerLinkLabel,
  footerLinkHref,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-10 lg:grid-cols-[1fr_440px]">
        <section className="space-y-5">
          <div className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            {eyebrow}
          </div>
          <div className="space-y-3">
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600">
              {description}
            </p>
          </div>
          <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-300 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">Access</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                Staff accounts
              </p>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">Use</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                Daily operations
              </p>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">Setup</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                Branch-based access
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-300 bg-white p-8 shadow-sm">
          {children}
          <p className="mt-6 text-center text-sm text-slate-500">
            {footerText}{" "}
            <Link href={footerLinkHref} className="font-semibold text-slate-900">
              {footerLinkLabel}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
