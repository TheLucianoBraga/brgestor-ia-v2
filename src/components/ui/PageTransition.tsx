import React, { ReactNode } from 'react';
import { motion, Variants, Easing } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const easeOut: Easing = [0.0, 0.0, 0.2, 1];
const easeIn: Easing = [0.4, 0.0, 1, 1];

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: easeIn,
    },
  },
};

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className }) => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Stagger animation for lists
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: easeOut,
    },
  },
};

// Card hover animation component
interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ children, className, onClick }) => {
  return (
    <motion.div
      whileHover={{ 
        y: -4,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};
