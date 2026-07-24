import { MotiView } from "moti";
import type { ReactNode } from "react";

// Fluid entrance motion matching the web (fade + rise). Spring-based, GPU.

export function FadeIn({
  children,
  delay = 0,
  from = 10,
  className,
}: {
  children: ReactNode;
  delay?: number;
  from?: number;
  className?: string;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: from }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 260, delay }}
      className={className}
    >
      {children}
    </MotiView>
  );
}

/** Staggered list item — pass the index to cascade the reveal. */
export function StaggerItem({
  children,
  index,
  className,
}: {
  children: ReactNode;
  index: number;
  className?: string;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 34, delay: Math.min(index, 12) * 45 }}
      className={className}
    >
      {children}
    </MotiView>
  );
}
