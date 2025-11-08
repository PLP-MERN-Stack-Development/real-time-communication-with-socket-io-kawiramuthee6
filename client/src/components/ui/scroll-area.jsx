import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export const ScrollArea = forwardRef(function ScrollArea(
  { className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="custom-scroll h-full w-full overflow-y-auto pr-2">
        {children}
      </div>
    </div>
  );
});
