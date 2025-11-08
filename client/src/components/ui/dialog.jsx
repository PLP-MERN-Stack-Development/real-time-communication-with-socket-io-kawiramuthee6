import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../../lib/utils";
import { Button } from "./button";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogPortal({ className, children, ...props }) {
  return (
    <DialogPrimitive.Portal {...props}>
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center",
          className
        )}
      >
        {children}
      </div>
    </DialogPrimitive.Portal>
  );
}

export const DialogOverlay = DialogPrimitive.Overlay;

export function DialogContent({ className, children, ...props }) {
  return (
    <DialogPortal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "relative z-50 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export const DialogHeader = ({ className, ...props }) => (
  <div className={cn("space-y-2 text-left", className)} {...props} />
);

export const DialogTitle = ({ className, ...props }) => (
  <DialogPrimitive.Title
    className={cn("text-lg font-semibold text-white", className)}
    {...props}
  />
);

export const DialogDescription = ({ className, ...props }) => (
  <DialogPrimitive.Description
    className={cn("text-sm text-slate-300/90", className)}
    {...props}
  />
);

export const DialogFooter = ({ className, ...props }) => (
  <div className={cn("mt-6 flex justify-end gap-3", className)} {...props} />
);

export function DialogCloseButton({ children = "Close" }) {
  return (
    <DialogPrimitive.Close asChild>
      <Button variant="ghost">{children}</Button>
    </DialogPrimitive.Close>
  );
}
