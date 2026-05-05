interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

type BadgeVariant = string;
interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "gray", className = "" }: BadgeProps) {
  const isHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(variant);
  const style = isHex ? { background: variant, color: "#fff" } as React.CSSProperties : undefined;
  const cls = isHex ? `badge ${className}`.trim() : `badge badge-${variant} ${className}`.trim();
  return <span className={cls} style={style}>{children}</span>;
}
