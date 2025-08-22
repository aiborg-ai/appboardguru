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
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full",
                className
              )}
              aria-label={variant === "help" ? "Help information" : "Additional information"}
            >
              <IconComponent 
                className={cn(
                  sizeClasses[size],
                  iconClassName
                )} 
              />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <div className="space-y-1">
            {typeof content === "string" ? (
              <p className="text-sm">{content}</p>
            ) : (
              content
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
    <div className={cn("space-y-3", className)}>
      <div>
        <h4 className="font-medium text-sm mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      
      {features && features.length > 0 && (
        <div>
          <h5 className="font-medium text-xs mb-1 text-muted-foreground uppercase tracking-wide">Features</h5>
          <ul className="text-sm space-y-1">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-green-500 mt-0.5">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {tips && tips.length > 0 && (
        <div>
          <h5 className="font-medium text-xs mb-1 text-muted-foreground uppercase tracking-wide">Tips</h5>
          <ul className="text-sm space-y-1">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-blue-500 mt-0.5">💡</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
})