'use client'

import React, { ReactNode, useRef } from 'react'
import { motion, useInView, useAnimation, Variants, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

// Animation presets for common use cases
export const cardAnimations = {
  // Staggered entrance animation
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
        when: "beforeChildren"
      }
    }
  } as Variants,

  // Individual card entrance
  cardEntrance: {
    hidden: { 
      opacity: 0, 
      y: 30, 
      scale: 0.95,
      rotateX: 10
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      rotateX: 0,
      transition: { 
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94], // easeOutQuart
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  } as Variants,

  // Gentle floating animation
  float: {
    initial: { y: 0 },
    animate: {
      y: [-2, 2, -2],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  } as Variants,

  // Hover scale effect
  scaleOnHover: {
    initial: { scale: 1 },
    hover: { 
      scale: 1.02,
      transition: { 
        duration: 0.2,
        ease: "easeOut"
      }
    },
    tap: { 
      scale: 0.98,
      transition: { 
        duration: 0.1,
        ease: "easeInOut"
      }
    }
  } as Variants,

  // Shimmer loading effect
  shimmer: {
    initial: { x: '-100%' },
    animate: { 
      x: '100%',
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  } as Variants,

  // Slide in from different directions
  slideInFromLeft: {
    hidden: { x: -50, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  } as Variants,

  slideInFromRight: {
    hidden: { x: 50, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  } as Variants,

  // Rotation entrance
  rotateIn: {
    hidden: { rotate: -10, opacity: 0, scale: 0.95 },
    visible: { 
      rotate: 0, 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  } as Variants
}

// Custom animation timing functions
export const easings = {
  // Material Design easing
  standard: [0.4, 0.0, 0.2, 1],
  decelerate: [0.0, 0.0, 0.2, 1],
  accelerate: [0.4, 0.0, 1, 1],
  
  // Custom smooth easings
  smoothOut: [0.25, 0.46, 0.45, 0.94],
  smoothIn: [0.55, 0.06, 0.68, 0.19],
  bounce: [0.68, -0.55, 0.265, 1.55],
  
  // Performance-optimized easings
  easeOutQuart: [0.25, 1, 0.5, 1],
  easeInOutCubic: [0.645, 0.045, 0.355, 1],
}

// Reusable animated wrapper components
interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode
  delay?: number
  className?: string
  animationType?: keyof typeof cardAnimations
  enableHover?: boolean
  enableFloat?: boolean
}

/**
 * Animated card wrapper with configurable animations
 */
export function AnimatedCard({
  children,
  delay = 0,
  className,
  animationType = 'cardEntrance',
  enableHover = true,
  enableFloat = false,
  ...motionProps
}: AnimatedCardProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  
  const baseAnimation = cardAnimations[animationType]
  
  const combinedVariants = {
    ...baseAnimation,
    ...(enableHover && cardAnimations.scaleOnHover),
    ...(enableFloat && cardAnimations.float)
  }

  return (
    <motion.div
      ref={ref}
      variants={combinedVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      whileHover={enableHover ? "hover" : undefined}
      whileTap={enableHover ? "tap" : undefined}
      style={{
        perspective: 1000,
        transformStyle: "preserve-3d"
      }}
      transition={{
        delay,
        ...combinedVariants.visible?.transition
      }}
      className={cn(
        "will-change-transform", // Optimize for animations
        className
      )}
      {...motionProps}
    >
      {children}
    </motion.div>
  )
}

/**
 * Staggered container for multiple cards
 */
interface StaggeredContainerProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
  initialDelay?: number
}

export function StaggeredContainer({
  children,
  className,
  staggerDelay = 0.1,
  initialDelay = 0.2
}: StaggeredContainerProps) {
  return (
    <motion.div
      variants={{
        ...cardAnimations.staggerContainer,
        visible: {
          ...cardAnimations.staggerContainer.visible,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay,
            when: "beforeChildren"
          }
        }
      }}
      initial="hidden"
      animate="visible"
      className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}
    >
      {children}
    </motion.div>
  )
}

/**
 * Loading shimmer effect component
 */
export function ShimmerOverlay({ 
  className 
}: { 
  className?: string 
}) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <motion.div
        variants={cardAnimations.shimmer}
        initial="initial"
        animate="animate"
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)"
        }}
      />
    </div>
  )
}

/**
 * Click ripple effect
 */
interface ClickRippleProps {
  x: number
  y: number
  onComplete: () => void
}

export function ClickRipple({ x, y, onComplete }: ClickRippleProps) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ 
        left: x - 25, 
        top: y - 25,
        width: 50,
        height: 50
      }}
      initial={{ scale: 0, opacity: 0.5 }}
      animate={{ scale: 2, opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      onAnimationComplete={onComplete}
    >
      <div className="w-full h-full bg-blue-400 rounded-full" />
    </motion.div>
  )
}

/**
 * Floating action button with spring animation
 */
interface FloatingActionProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  delay?: number
}

export function FloatingAction({
  children,
  onClick,
  className,
  delay = 0
}: FloatingActionProps) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
        delay
      }}
      onClick={onClick}
      className={cn(
        "rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        className
      )}
    >
      {children}
    </motion.button>
  )
}

/**
 * Smooth transition wrapper for view changes
 */
interface TransitionWrapperProps {
  children: ReactNode
  mode?: 'fade' | 'slide' | 'scale'
  duration?: number
  className?: string
}

export function TransitionWrapper({
  children,
  mode = 'fade',
  duration = 0.3,
  className
}: TransitionWrapperProps) {
  const modeVariants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    slide: {
      initial: { x: 20, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: -20, opacity: 0 }
    },
    scale: {
      initial: { scale: 0.95, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 1.05, opacity: 0 }
    }
  }

  return (
    <motion.div
      variants={modeVariants[mode]}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration, ease: easings.standard as any }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Performance optimized list container with viewport animations
 */
interface ViewportAnimatedListProps {
  children: ReactNode
  className?: string
  itemClassName?: string
  staggerDelay?: number
}

export function ViewportAnimatedList({
  children,
  className,
  itemClassName,
  staggerDelay = 0.05
}: ViewportAnimatedListProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.1 })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { 
              opacity: 1, 
              y: 0,
              transition: { duration: 0.4, ease: easings.smoothOut as any }
            }
          }}
          className={itemClassName}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

/**
 * CSS keyframes for performance-critical animations
 */
export const cssAnimations = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  @keyframes pulse-soft {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.02);
    }
  }

  @keyframes bounce-in {
    0% {
      transform: scale(0.3) rotate(-5deg);
      opacity: 0;
    }
    50% {
      transform: scale(1.05) rotate(2deg);
    }
    70% {
      transform: scale(0.9) rotate(-1deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }

  .animate-shimmer {
    animation: shimmer 2s infinite;
  }

  .animate-pulse-soft {
    animation: pulse-soft 2s ease-in-out infinite;
  }

  .animate-bounce-in {
    animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
`

export default {
  AnimatedCard,
  StaggeredContainer,
  ShimmerOverlay,
  ClickRipple,
  FloatingAction,
  TransitionWrapper,
  ViewportAnimatedList,
  cardAnimations,
  easings,
  cssAnimations
}