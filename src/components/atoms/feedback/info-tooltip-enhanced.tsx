"use client"

import * as React from "react"
import { HelpCircle, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"
import { cn } from "@/lib/utils"

export interface InfoTooltipEnhancedProps {
  content: React.ReactNode
  className?: string
  iconClassName?: string
  side?: "top" | "right" | "bottom" | "left"
  variant?: "help" | "info"
  size?: "sm" | "md" | "lg"
  children?: React.ReactNode
  pulse?: boolean
  show?: boolean
}

export const InfoTooltipEnhanced = React.memo(function InfoTooltipEnhanced({
  content,
  className,
  iconClassName,
  side = "top",
  variant = "info",
  size = "md",
  children,
  pulse = true,
  show = false
}: InfoTooltipEnhancedProps) {
  const IconComponent = variant === "help" ? HelpCircle : Info
  const [forceOpen, setForceOpen] = React.useState(show)
  
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  }

  // Auto-close forced tooltip after 3 seconds
  React.useEffect(() => {
    if (show && forceOpen) {
      const timer = setTimeout(() => setForceOpen(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [show, forceOpen])

  return (
    <Tooltip open={forceOpen ? true : undefined}>
      <TooltipTrigger asChild>
        {children || (
          <button
            type="button"
            className={cn(
              // Enhanced styling for better visibility
              "inline-flex items-center justify-center",
              "w-7 h-7 rounded-full relative",
              "text-blue-500 hover:text-blue-700",
              "bg-blue-50 hover:bg-blue-100",
              "border border-blue-200 hover:border-blue-300",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              "shadow-sm hover:shadow-md",
              "group",
              className
            )}
            aria-label={variant === "help" ? "Help information" : "Additional information"}
          >
            <IconComponent 
              className={cn(
                sizeClasses[size],
                "group-hover:scale-110 transition-transform duration-200",
                iconClassName
              )} 
            />
            {/* Pulse animation ring */}
            {pulse && (
              <span className="absolute top-0 left-0 w-full h-full rounded-full bg-blue-400 animate-ping opacity-30"></span>
            )}
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-sm z-50 bg-white border shadow-lg">
        <div className="space-y-2">
          {typeof content === "string" ? (
            <p className="text-sm leading-relaxed text-gray-700">{content}</p>
          ) : (
            content
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
})

export const InfoBadge = React.memo(function InfoBadge({
  content,
  className
}: {
  content: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
      "bg-blue-100 text-blue-800 border border-blue-200",
      className
    )}>
      <Info className="h-3 w-3 mr-1" />
      {content}
    </div>
  )
})