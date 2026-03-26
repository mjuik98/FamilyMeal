import React from "react";

export default function SurfaceSection({
  title,
  caption,
  actions,
  children,
  bodyClassName,
}: {
  title?: React.ReactNode;
  caption?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="surface-card surface-section">
      {title || caption || actions ? (
        <div className="surface-header">
          <div>
            {title ? <span style={{ fontWeight: 700 }}>{title}</span> : null}
            {caption ? <p className="surface-note">{caption}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className={bodyClassName ?? "surface-body"}>{children}</div>
    </section>
  );
}
