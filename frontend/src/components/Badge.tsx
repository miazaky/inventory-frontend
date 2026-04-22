type BadgeVariant = "green" | "red" | "yellow" | "blue" | "gray" | "orange" | "purple" | "black";
interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "gray", className = "" }: BadgeProps) {
  return <span className={`badge badge-${variant} ${className}`.trim()}>{children}</span>;
}
