import { forwardRef } from "react";
import { cn } from "../../lib/utils";

const baseStyles =
  "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";

const variants = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-400 ring-offset-slate-900",
  secondary:
    "bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:ring-slate-400 ring-offset-slate-900",
  ghost:
    "bg-transparent text-slate-200 hover:bg-slate-800/60 focus-visible:ring-slate-400 ring-offset-slate-900",
  subtle:
    "bg-slate-200 text-slate-900 hover:bg-slate-300 focus-visible:ring-slate-400 ring-offset-white"
};

const sizes = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10"
};

export const Button = forwardRef(function Button(
  { className, variant = "primary", size = "default", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  );
});

export default Button;
