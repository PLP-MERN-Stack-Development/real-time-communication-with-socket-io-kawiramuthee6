import { cn } from "../../lib/utils";

export function Avatar({ className, src, alt, fallback, size = "md" }) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  };

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 text-xs font-semibold uppercase text-white/70",
        sizes[size],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
        />
      ) : (
        fallback?.slice(0, 2) || "U"
      )}
    </div>
  );
}
