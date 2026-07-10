"use client";

import * as React from "react";
import { motion, AnimatePresence, MotionConfig, type HTMLMotionProps } from "motion/react";
import { staggerContainer, fadeInUp, cardHover } from "@/lib/motion";

/** Root provider — honors the OS "reduce motion" setting globally. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Container that reveals its children in a staggered sequence on mount. */
export function Stagger({ children, className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** A staggered/entering item. Pair with <AnimatePresence> for exit animations. */
export function RevealItem({ children, className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={fadeInUp} exit="exit" className={className} {...props}>
      {children}
    </motion.div>
  );
}

/** Interactive card: subtle lift on hover, settle on press. */
export function MotionCard({ children, className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={fadeInUp} exit="exit" {...cardHover} className={className} {...props}>
      {children}
    </motion.div>
  );
}

export { motion, AnimatePresence };
