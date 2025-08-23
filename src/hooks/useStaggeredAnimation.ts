import { useCallback, useEffect, useRef, useState } from 'react'
import { useInView, useAnimation, Variants } from 'framer-motion'

interface StaggeredAnimationOptions {
  staggerDelay?: number
  initialDelay?: number
  threshold?: number
  triggerOnce?: boolean
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade'
  distance?: number
  duration?: number
  easing?: string | number[]
}

interface StaggeredAnimationResult {
  containerRef: React.RefObject<HTMLDivElement>
  containerVariants: Variants
  itemVariants: Variants
  isVisible: boolean
  isAnimating: boolean
  triggerAnimation: () => void
  resetAnimation: () => void
}

/**
 * Custom hook for creating sophisticated staggered animations
 * Optimized for performance with viewport detection and animation controls
 */
export function useStaggeredAnimation({
  staggerDelay = 0.1,
  initialDelay = 0.2,
  threshold = 0.1,
  triggerOnce = true,
  direction = 'up',
  distance = 30,
  duration = 0.5,
  easing = [0.25, 0.46, 0.45, 0.94] // easeOutQuart
}: StaggeredAnimationOptions = {}): StaggeredAnimationResult {
  
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { 
    once: triggerOnce, 
    amount: threshold 
  })
  
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const controls = useAnimation()

  // Generate direction-based transforms
  const getDirectionTransform = useCallback(() => {
    switch (direction) {
      case 'up':
        return { y: distance }
      case 'down':
        return { y: -distance }
      case 'left':
        return { x: distance }
      case 'right':
        return { x: -distance }
      case 'scale':
        return { scale: 0.8 }
      case 'fade':
        return {}
      default:
        return { y: distance }
    }
  }, [direction, distance])

  // Container variants for staggered children
  const containerVariants: Variants = {
    hidden: {
      opacity: direction === 'fade' ? 0 : 1
    },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: initialDelay,
        staggerChildren: staggerDelay,
        when: "beforeChildren",
        duration: direction === 'fade' ? duration : 0
      }
    }
  }

  // Individual item variants
  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      ...getDirectionTransform()
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        duration,
        ease: easing,
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  }

  // Trigger animation manually
  const triggerAnimation = useCallback(async () => {
    setIsAnimating(true)
    await controls.start("visible")
    setIsAnimating(false)
  }, [controls])

  // Reset animation to initial state
  const resetAnimation = useCallback(async () => {
    setIsAnimating(true)
    await controls.start("hidden")
    setIsVisible(false)
    setIsAnimating(false)
  }, [controls])

  // Handle viewport intersection
  useEffect(() => {
    if (isInView && !isVisible) {
      setIsVisible(true)
      triggerAnimation()
    }
  }, [isInView, isVisible, triggerAnimation])

  return {
    containerRef,
    containerVariants,
    itemVariants,
    isVisible,
    isAnimating,
    triggerAnimation,
    resetAnimation
  }
}

/**
 * Hook for sequenced animations with multiple phases
 */
interface SequencedAnimationOptions {
  sequences: Array<{
    delay?: number
    duration?: number
    animation: Variants
  }>
  triggerOnMount?: boolean
  loop?: boolean
}

export function useSequencedAnimation({
  sequences,
  triggerOnMount = false,
  loop = false
}: SequencedAnimationOptions) {
  const [currentSequence, setCurrentSequence] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const controls = useAnimation()

  const playSequence = useCallback(async () => {
    if (isPlaying) return
    
    setIsPlaying(true)
    
    for (let i = 0; i < sequences.length; i++) {
      const sequence = sequences[i]
      setCurrentSequence(i)
      
      await new Promise(resolve => setTimeout(resolve, sequence.delay || 0))
      await controls.start(sequence.animation)
    }
    
    setIsPlaying(false)
    
    if (loop) {
      setTimeout(playSequence, 1000) // 1 second pause before loop
    }
  }, [sequences, controls, isPlaying, loop])

  const stopSequence = useCallback(() => {
    setIsPlaying(false)
    controls.stop()
  }, [controls])

  const resetSequence = useCallback(() => {
    setCurrentSequence(0)
    setIsPlaying(false)
    controls.set(sequences[0]?.animation || {})
  }, [sequences, controls])

  useEffect(() => {
    if (triggerOnMount) {
      playSequence()
    }
  }, [triggerOnMount, playSequence])

  return {
    currentSequence,
    isPlaying,
    playSequence,
    stopSequence,
    resetSequence,
    controls
  }
}

/**
 * Hook for performance-optimized list animations
 * Uses intersection observer to animate only visible items
 */
interface ListAnimationOptions {
  itemSelector?: string
  staggerDelay?: number
  animateOnScroll?: boolean
  rootMargin?: string
}

export function useListAnimation({
  itemSelector = '[data-list-item]',
  staggerDelay = 0.05,
  animateOnScroll = true,
  rootMargin = '50px'
}: ListAnimationOptions = {}) {
  
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const listRef = useRef<HTMLElement>(null)

  // Setup intersection observer for list items
  useEffect(() => {
    if (!animateOnScroll || !listRef.current) return

    const items = listRef.current.querySelectorAll(itemSelector)
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Array.from(items).indexOf(entry.target as Element)
          if (entry.isIntersecting) {
            setVisibleItems(prev => new Set([...prev, index]))
          }
        })
      },
      {
        rootMargin,
        threshold: 0.1
      }
    )

    items.forEach(item => observerRef.current?.observe(item))

    return () => {
      observerRef.current?.disconnect()
    }
  }, [itemSelector, animateOnScroll, rootMargin])

  // Get animation delay for specific item
  const getItemDelay = useCallback((index: number) => {
    return visibleItems.has(index) ? index * staggerDelay : 0
  }, [visibleItems, staggerDelay])

  // Check if item should be animated
  const shouldAnimateItem = useCallback((index: number) => {
    return !animateOnScroll || visibleItems.has(index)
  }, [animateOnScroll, visibleItems])

  return {
    listRef,
    getItemDelay,
    shouldAnimateItem,
    visibleItems: Array.from(visibleItems)
  }
}

/**
 * Hook for scroll-triggered animations
 */
interface ScrollAnimationOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
  onEnter?: () => void
  onExit?: () => void
}

export function useScrollAnimation({
  threshold = 0.5,
  rootMargin = '0px',
  triggerOnce = true,
  onEnter,
  onExit
}: ScrollAnimationOptions = {}) {
  
  const elementRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hasBeenVisible, setHasBeenVisible] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting
        
        if (isIntersecting) {
          setIsVisible(true)
          setHasBeenVisible(true)
          onEnter?.()
        } else if (!triggerOnce || !hasBeenVisible) {
          setIsVisible(false)
          onExit?.()
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold, rootMargin, triggerOnce, hasBeenVisible, onEnter, onExit])

  return {
    elementRef,
    isVisible,
    hasBeenVisible
  }
}

/**
 * Hook for mouse-following animations
 */
export function useMouseAnimation(elementRef: React.RefObject<HTMLElement>) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20
      
      setMousePosition({ x, y })
    }

    const handleMouseEnter = () => setIsHovering(true)
    const handleMouseLeave = () => {
      setIsHovering(false)
      setMousePosition({ x: 0, y: 0 })
    }

    element.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [elementRef])

  return {
    mousePosition,
    isHovering,
    transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`
  }
}

/**
 * Hook for spring-based animations with physics
 */
interface SpringAnimationOptions {
  stiffness?: number
  damping?: number
  mass?: number
  velocity?: number
}

export function useSpringAnimation({
  stiffness = 100,
  damping = 10,
  mass = 1,
  velocity = 0
}: SpringAnimationOptions = {}) {
  
  const controls = useAnimation()
  const [isAnimating, setIsAnimating] = useState(false)

  const animate = useCallback(async (to: Record<string, number | string>) => {
    setIsAnimating(true)
    
    await controls.start({
      ...to,
      transition: {
        type: "spring",
        stiffness,
        damping,
        mass,
        velocity
      }
    })
    
    setIsAnimating(false)
  }, [controls, stiffness, damping, mass, velocity])

  const stop = useCallback(() => {
    controls.stop()
    setIsAnimating(false)
  }, [controls])

  return {
    controls,
    animate,
    stop,
    isAnimating
  }
}

export default useStaggeredAnimation