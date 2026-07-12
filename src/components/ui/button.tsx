import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
{
variants: {
variant: {
default:
"bg-gradient-primary text-white shadow-glow hover:shadow-glow-accent hover:brightness-110",
secondary:
"border border-border bg-white text-navy shadow-soft hover:border-primary/30 hover:shadow-card",
outline:
"border border-primary/30 bg-transparent text-primary hover:bg-primary/5",
ghost: "text-navy hover:bg-primary/5",
link: "text-primary underline-offset-4 hover:underline",
navy: "bg-navy text-white shadow-elevated hover:bg-navy/90",
},
size: {
default: "h-11 px-6 py-3",
sm: "h-9 rounded-lg px-4 text-xs",
lg: "h-13 rounded-xl px-8 py-4 text-base",
icon: "h-10 w-10",
},
},
defaultVariants: {
variant: "default",
size: "default",
},
}
);

export interface ButtonProps
extends React.ButtonHTMLAttributes<HTMLButtonElement>,
VariantProps<typeof buttonVariants> {
asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
({ className, variant, size, asChild = false, ...props }, ref) => {
const Comp = asChild ? Slot : "button";
return (
<Comp
className={cn(buttonVariants({ variant, size, className }))}
ref={ref}
{...props}
/>
);
}
);
Button.displayName = "Button";

export { Button, buttonVariants };