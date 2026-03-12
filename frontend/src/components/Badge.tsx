type BadgeVariant = "green" | "red" | "yellow" | "blue" | "gray" | "orange" | "purple";
interface BadgeProps { children: React.ReactNode; variant?: BadgeVariant; }
export function Badge({ children, variant = "gray" }: BadgeProps) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
