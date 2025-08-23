import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "../../atoms/Button"
import { Icon } from "../../atoms/Icon"

export interface FormSection {
  id: string
  title: string
  description?: string
  children: React.ReactNode
  collapsible?: boolean
  defaultCollapsed?: boolean
}

export interface FormLayoutProps {
  title?: string
  description?: string
  sections?: FormSection[]
  children?: React.ReactNode
  actions?: React.ReactNode
  onSubmit?: (e: React.FormEvent) => void
  loading?: boolean
  className?: string
  layout?: 'single' | 'sections' | 'wizard'
  showProgress?: boolean
  currentStep?: number
  totalSteps?: number
}

const FormLayout = React.memo<FormLayoutProps>(({
  title,
  description,
  sections = [],
  children,
  actions,
  onSubmit,
  loading = false,
  className,
  layout = 'single',
  showProgress = false,
  currentStep = 1,
  totalSteps,
}) => {
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(
    new Set(sections.filter(s => s.defaultCollapsed).map(s => s.id))
  )

  const toggleSection = React.useCallback((sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }, [])

  const handleSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.(e)
  }, [onSubmit])

  const renderProgressBar = () => {
    if (!showProgress || !totalSteps) return null

    const progress = (currentStep / totalSteps) * 100

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  const renderSections = () => {
    return sections.map((section) => {
      const isCollapsed = collapsedSections.has(section.id)

      return (
        <div key={section.id} className="border rounded-lg">
          <div 
            className={cn(
              "flex items-center justify-between p-4",
              section.collapsible && "cursor-pointer hover:bg-muted/50"
            )}
            onClick={section.collapsible ? () => toggleSection(section.id) : undefined}
          >
            <div>
              <h3 className="text-lg font-medium">{section.title}</h3>
              {section.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {section.description}
                </p>
              )}
            </div>
            {section.collapsible && (
              <Icon
                name={isCollapsed ? "ChevronDown" : "ChevronUp"}
                size="sm"
              />
            )}
          </div>
          
          {!isCollapsed && (
            <div className="p-4 pt-0 border-t">
              {section.children}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <div className={cn("max-w-4xl mx-auto", className)}>
      {/* Header */}
      {(title || description || showProgress) && (
        <div className="mb-8">
          {(title || description) && (
            <div className="text-center mb-6">
              {title && (
                <h1 className="text-2xl font-bold tracking-tight mb-2">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          )}
          {renderProgressBar()}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {layout === 'sections' && sections.length > 0 ? (
          <div className="space-y-6">
            {renderSections()}
          </div>
        ) : (
          <div className="space-y-6">
            {children}
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div className="flex items-center justify-end gap-4 pt-6 border-t">
            {actions}
          </div>
        )}
      </form>
    </div>
  )
})

// Compound components for better composition
const FormSection: React.FC<{
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}> = ({ title, description, children, className }) => {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

const FormActions: React.FC<{
  children: React.ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
}> = ({ children, align = 'right', className }) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }

  return (
    <div className={cn("flex items-center gap-4", alignClasses[align], className)}>
      {children}
    </div>
  )
}

FormLayout.Section = FormSection
FormLayout.Actions = FormActions

export { FormLayout, FormSection, FormActions }