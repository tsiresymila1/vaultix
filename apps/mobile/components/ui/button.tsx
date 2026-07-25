import * as React from "react";
import { ActivityIndicator, Pressable } from "react-native";
import { Slot } from "@rn-primitives/slot";
import { cva, type VariantProps } from "class-variance-authority";
import { TextClassContext } from "./text";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/theme";

const buttonVariants = cva(
  "flex-row items-center justify-center gap-2 rounded-md active:opacity-75",
  {
    variants: {
      variant: {
        default: "bg-primary",
        destructive: "bg-destructive",
        outline: "border border-border bg-card",
        secondary: "bg-secondary",
        ghost: "bg-transparent",
      },
      size: {
        default: "h-[50px] px-5",
        sm: "h-9 px-3",
        lg: "h-14 px-7",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const buttonTextVariants = cva("text-base font-semibold", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-white",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-foreground",
    },
    size: { default: "", sm: "text-sm", lg: "text-lg", icon: "" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

type ButtonProps = React.ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : Pressable;
  const isDisabled = disabled || loading;
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Component
        disabled={isDisabled}
        className={cn(isDisabled && "opacity-50", buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading && !asChild ? (
          <ActivityIndicator
            color={variant === "default" || !variant ? colors.primaryForeground : colors.primary}
          />
        ) : (
          children
        )}
      </Component>
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
