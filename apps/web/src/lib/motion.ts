import type { Variants, Transition } from "motion/react";

// Shared motion vocabulary. Everything animates transform/opacity only (GPU
// compositor — no layout thrash), so it stays smooth on long lists.

/** Snappy spring for entrances and layout shifts. */
export const spring: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.8,
};

/** Quick, calm ease for fades and hovers. */
export const ease: Transition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1], // easeOutExpo-ish
};

/** Container that reveals its children in sequence. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.045, delayChildren: 0.04 },
  },
};

/** A single item: rises + fades in, drops + fades out (for AnimatePresence). */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: ease },
};

/** Plain fade — for page/content transitions. */
export const fade: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: ease },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/** Subtle lift + settle for interactive cards. */
export const cardHover = {
  whileHover: { y: -3, transition: ease },
  whileTap: { scale: 0.985, transition: { duration: 0.1 } },
};
