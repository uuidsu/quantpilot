"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// iOS 18 inset-grouped card
export const Card = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "bg-card rounded-2xl overflow-hidden shadow-card",
      className
    )}
    {...props}
  >
    {children}
  </div>
);


export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger" | "success" | "ghost" | "outline";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
  }
>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: "bg-primary text-white active:bg-primary/85",
      secondary: "bg-secondary text-foreground active:bg-secondary/70",
      danger: "bg-destructive text-white active:bg-destructive/85",
      success: "bg-success text-white active:bg-success/85",
      ghost: "bg-transparent text-primary active:bg-primary/10",
      outline: "border border-border bg-transparent text-foreground active:bg-secondary/60",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm rounded-lg",
      md: "px-5 py-2.5 text-[15px] rounded-xl",
      lg: "px-6 py-3.5 text-[17px] font-semibold rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "active:scale-[0.97]",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex w-full rounded-xl border-0 bg-secondary px-4 py-3 text-[15px] transition-colors",
      "placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Label = ({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn(
      "text-[13px] font-medium uppercase tracking-wide text-muted-foreground",
      className
    )}
    {...props}
  />
);

export const AnimatedNumber = ({
  value,
  prefix = "",
  suffix = "",
  decimals = 2,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) => {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.8, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="font-mono tabular-nums"
    >
      {prefix}
      {value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </motion.span>
  );
};
