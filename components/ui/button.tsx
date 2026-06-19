import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-center text-sm font-medium leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: { default: "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(29,158,117,.22)] hover:bg-[#0F6E56]", outline: "border border-black/10 bg-white hover:bg-[#F8F7F4]", ghost: "hover:bg-[#F8F7F4]" },
    size: { default: "px-4 py-2.5", sm: "px-3 py-2", lg: "px-5 py-3" }
  },
  defaultVariants: { variant: "default", size: "default" }
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";
export { Button, buttonVariants };
