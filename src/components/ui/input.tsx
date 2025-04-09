import * as React from "react";
import { cn } from "@/lib/utils";
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border bg-zinc-900/50 px-3 py-2",
          "text-sm text-zinc-200 transition-colors",
          "border-zinc-700/50 hover:border-zinc-600/50",
          "focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:ring-offset-2 focus:ring-offset-zinc-900",
          "placeholder:text-zinc-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input }; 