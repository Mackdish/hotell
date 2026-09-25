"use client";

export default function StatusBadge({ status, variant = "default" }) {
  const variants = {
    default: "status-pill",
    success: "status-pill success",
    warning: "status-pill warning",
    error: "status-pill error",
  };

  const badgeClass = variants[variant] || variants.default;

  return (
    <span className={badgeClass}>
      <span />{status}
    </span>
  );
}