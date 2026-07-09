import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex min-h-11 items-center justify-center gap-2 rounded-full text-center text-sm font-semibold leading-tight tracking-[0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E1F5EE] disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(29,158,117,.18)] hover:-translate-y-0.5 hover:bg-[#0F6E56] hover:shadow-[0_14px_30px_rgba(29,158,117,.22)]",
      outline: "border border-black/10 bg-white/90 text-[#4D4A43] shadow-[0_1px_2px_rgba(0,0,0,.04)] hover:-translate-y-0.5 hover:border-black/15 hover:bg-[#F8F7F4] hover:shadow-[0_10px_24px_rgba(0,0,0,.08)]",
      ghost: "text-[#4D4A43] hover:bg-[#F8F7F4]",
    },
    size: { default: "px-4 py-2.5", sm: "px-3.5 py-2", lg: "px-5 py-3.5" }
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
