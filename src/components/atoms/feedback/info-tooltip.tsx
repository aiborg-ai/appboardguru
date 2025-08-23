"use client"

import * as React from "react"
import { HelpCircle, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"
import { cn } from "@/lib/utils"

export interface InfoTooltipProps {
  content: React.ReactNode
  className?: string
  iconClassName?: string
  side?: "top" | "right" | "bottom" | "left"
  variant?: "help" | "info"
  size?: "sm" | "md" | "lg"
  children?: React.ReactNode
}

export const InfoTooltip = React.memo(function InfoTooltip({
  content,
  className,
  iconClassName,
  side = "top",
  variant = "info",
  size = "md",
  children
}: InfoTooltipProps) {
  const IconComponent = variant === "help" ? HelpCircle : Info
  
  const sizeClasses = {
    sm: "h-4 w-4",  // Increased from h-3 w-3
    md: "h-5 w-5",  // Increased from h-4 w-4
    lg: "h-6 w-6"   // Increased from h-5 w-5
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children || (
          <button
            type="button"
            className={cn(
              // Enhanced styling for better visibility
              "inline-flex items-center justify-center",
              "w-7 h-7 rounded-full",
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
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-sm z-50">
        <div className="space-y-2">
          {typeof content === "string" ? (
            <p className="text-sm leading-relaxed">{content}</p>
          ) : (
            content
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
})

export interface InfoSectionProps {
  title: string
  description: string
  features?: string[]
  tips?: string[]
  className?: string
}

export const InfoSection = React.memo(function InfoSection({
  title,
  description,
  features,
  tips,
  className
}: InfoSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h4 className="font-semibold text-base mb-2 text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
      
      {features && features.length > 0 && (
        <div>
          <h5 className="font-semibold text-xs mb-2 text-green-700 uppercase tracking-wide flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Features
          </h5>
          <ul className="text-sm space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-500 mt-1 font-bold">✓</span>
                <span className="leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {tips && tips.length > 0 && (
        <div>
          <h5 className="font-semibold text-xs mb-2 text-blue-700 uppercase tracking-wide flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Tips
          </h5>
          <ul className="text-sm space-y-2">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5 text-base">💡</span>
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
})