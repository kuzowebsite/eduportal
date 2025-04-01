import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400 shadow-md shadow-black/20 hover:shadow-black/30 hover:scale-105",
        destructive:
          "bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-500 hover:to-pink-500 shadow-md shadow-red-900/20 hover:shadow-red-900/30 hover:scale-105",
        outline:
          "border border-cyan-600/40 text-cyan-300 hover:bg-cyan-900/40 hover:text-white shadow-md shadow-black/10 hover:shadow-black/20 hover:scale-105",
        secondary:
          "bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-500 hover:to-purple-400 shadow-md shadow-black/20 hover:shadow-black/30 hover:scale-105",
        ghost: "hover:bg-card/40 hover:text-cyan-300 transition-colors",
        link: "text-cyan-400 underline-offset-4 hover:underline hover:text-cyan-300",
        gradient:
          "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400 shadow-md shadow-black/20 hover:shadow-black/30 hover:scale-105",
        back: "bg-card/80 backdrop-blur-sm border border-border/30 text-cyan-300 hover:bg-card/90 hover:text-white rounded-full w-9 h-9 p-0 flex items-center justify-center shadow-md shadow-black/10 hover:shadow-black/30 hover:scale-110",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }

