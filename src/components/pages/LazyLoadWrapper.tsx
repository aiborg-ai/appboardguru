import * as React from "react"
import { cn } from "@/lib/utils"
import { Icon } from "../atoms/Icon"

export interface LazyLoadWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  error?: React.ReactNode
  className?: string
  minLoadTime?: number
}

const DefaultFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex items-center gap-3">
      <Icon name="Loader2" className="animate-spin" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  </div>
)

const DefaultError = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-4">
    <div className="text-center">
      <Icon name="AlertCircle" size="lg" className="text-destructive mx-auto mb-2" />
      <h3 className="text-lg font-medium mb-2">Failed to load component</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {error.message || 'Something went wrong'}
      </p>
    </div>
    <button
      onClick={retry}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
    >
      Try Again
    </button>
  </div>
)

const LazyLoadWrapper = React.memo<LazyLoadWrapperProps>(({
  children,
  fallback = <DefaultFallback />,
  error,
  className,
  minLoadTime = 0,
}) => {
  const [showContent, setShowContent] = React.useState(false)

  React.useEffect(() => {
    if (minLoadTime > 0) {
      const timer = setTimeout(() => setShowContent(true), minLoadTime)
      return () => clearTimeout(timer)
    } else {
      setShowContent(true)
    }
  }, [minLoadTime])

  if (!showContent) {
    return <div className={cn(className)}>{fallback}</div>
  }

  return <div className={cn(className)}>{children}</div>
})

LazyLoadWrapper.displayName = "LazyLoadWrapper"

// Error boundary for lazy loaded components
class LazyLoadErrorBoundary extends React.Component<
  {
    children: React.ReactNode
    fallback?: React.ComponentType<{ error: Error; retry: () => void }>
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo)
    console.error('LazyLoad Error:', error, errorInfo)
  }

  retry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultError
      return <FallbackComponent error={this.state.error} retry={this.retry} />
    }

    return this.props.children
  }
}

// HOC for creating lazy loaded components
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    fallback?: React.ReactNode
    errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>
    minLoadTime?: number
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  } = {}
) {
  const LazyComponent = React.lazy(async () => {
    // Add artificial delay if specified
    if (options.minLoadTime) {
      await new Promise(resolve => setTimeout(resolve, options.minLoadTime))
    }
    
    return { default: Component }
  })

  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <LazyLoadErrorBoundary
      fallback={options.errorFallback}
      onError={options.onError}
    >
      <React.Suspense fallback={options.fallback || <DefaultFallback />}>
        <LazyComponent {...props} ref={ref} />
      </React.Suspense>
    </LazyLoadErrorBoundary>
  ))

  WrappedComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Utility for preloading components
export function preloadComponent<P extends object>(
  componentFactory: () => Promise<{ default: React.ComponentType<P> }>
) {
  const componentPromise = componentFactory()
  
  return {
    preload: () => componentPromise,
    Component: React.lazy(() => componentPromise)
  }
}

export { LazyLoadWrapper, LazyLoadErrorBoundary }