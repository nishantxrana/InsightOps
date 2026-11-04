import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-control border border-input bg-background px-3 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-9 py-2",
        sm: "h-8 py-1 text-xs",
        lg: "h-11 py-2 text-[15px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const Input = React.forwardRef(({ className, type, size, ...props }, ref) => {
  return (
    <input type={type} className={cn(inputVariants({ size, className }))} ref={ref} {...props} />
  );
});
Input.displayName = "Input";

export { Input, inputVariants };
