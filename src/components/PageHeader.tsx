import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  subtitle,
  actions,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="page-header mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {kicker ? <p className="section-kicker">{kicker}</p> : null}
          <h1 className="page-title mt-2">{title}</h1>
          {subtitle ? <p className="dash-desc mt-2">{subtitle}</p> : null}
        </div>
        {actions ? <div className="w-full lg:w-auto">{actions}</div> : null}
      </div>
    </section>
  );
}
