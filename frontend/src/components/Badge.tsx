type BadgeVariant =
  | "green"
  | "red"
  | "yellow"
  | "blue"
  | "gray"
  | "orange"
  | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

const styles: Record<BadgeVariant, string> = {
  green: "bg-green-50 text-green-700 border border-green-200",
  red: "bg-red-50 text-red-700 border border-red-200",
  yellow: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  blue: "bg-blue-50 text-blue-700 border border-blue-200",
  gray: "bg-gray-100 text-gray-600 border border-gray-200",
  orange: "bg-orange-50 text-orange-700 border border-orange-200",
  purple: "bg-purple-50 text-purple-700 border border-purple-200",
};

export function Badge({ children, variant = "gray" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
