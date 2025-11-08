import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60",
        className
      )}
      {...props}
    />
  );
});

export default Input;
