import { cn } from "../../lib/utils";

export function Badge({ className, children, variant = "default", ...props }) {
  const variants = {
    default: "bg-indigo-500/90 text-white",
    outline: "border border-indigo-400/70 text-indigo-200",
    success: "bg-emerald-500/90 text-emerald-50"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
