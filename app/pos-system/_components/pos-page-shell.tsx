type PosPageShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function PosPageShell({
  title,
  description,
  children,
}: PosPageShellProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Point of sale
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  );
}
