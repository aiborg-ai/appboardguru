import * as React from "react"
import { cn } from "@/lib/utils"
import { Input, type InputProps } from "../../atoms/Input"
import { Button } from "../../atoms/Button"
import { Icon } from "../../atoms/Icon"
import { VoiceInputButton } from "../../../ui/VoiceInputButton"

export interface SearchInputProps extends Omit<InputProps, 'type' | 'leftIcon' | 'rightIcon'> {
  onSearch?: (query: string) => void
  onClear?: () => void
  loading?: boolean
  showSearchButton?: boolean
  showClearButton?: boolean
  showVoiceInput?: boolean
  debounceMs?: number
}

const SearchInput = React.memo(React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({
    onSearch,
    onClear,
    loading = false,
    showSearchButton = false,
    showClearButton = true,
    showVoiceInput = true,
    debounceMs = 300,
    className,
    value,
    onChange,
    placeholder = "Search...",
    ...props
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value || '')
    const debouncedSearchRef = React.useRef<NodeJS.Timeout>()

    // Sync internal value with external value
    React.useEffect(() => {
      setInternalValue(value || '')
    }, [value])

    // Debounced search
    const debouncedSearch = React.useCallback((query: string) => {
      if (debouncedSearchRef.current) {
        clearTimeout(debouncedSearchRef.current)
      }

      debouncedSearchRef.current = setTimeout(() => {
        onSearch?.(query)
      }, debounceMs)
    }, [onSearch, debounceMs])

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInternalValue(newValue)
      onChange?.(e)
      
      if (onSearch && debounceMs > 0) {
        debouncedSearch(newValue)
      } else if (onSearch) {
        onSearch(newValue)
      }
    }, [onChange, onSearch, debouncedSearch, debounceMs])

    const handleClear = React.useCallback(() => {
      setInternalValue('')
      onClear?.()
      
      // Create synthetic event for onChange
      const syntheticEvent = {
        target: { value: '' },
        currentTarget: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>
      
      onChange?.(syntheticEvent)
      onSearch?.('')
    }, [onChange, onSearch, onClear])

    const handleSearchClick = React.useCallback(() => {
      onSearch?.(internalValue)
    }, [onSearch, internalValue])

    const handleVoiceTranscription = React.useCallback((text: string) => {
      const newValue = internalValue + (internalValue ? ' ' : '') + text
      setInternalValue(newValue)
      
      // Create synthetic event for onChange
      const syntheticEvent = {
        target: { value: newValue },
        currentTarget: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>
      
      onChange?.(syntheticEvent)
      
      if (onSearch && debounceMs > 0) {
        debouncedSearch(newValue)
      } else if (onSearch) {
        onSearch(newValue)
      }
    }, [internalValue, onChange, onSearch, debouncedSearch, debounceMs])

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        e.preventDefault()
        onSearch(internalValue)
      }
      if (e.key === 'Escape' && internalValue) {
        handleClear()
      }
    }, [onSearch, internalValue, handleClear])

    // Cleanup debounce on unmount
    React.useEffect(() => {
      return () => {
        if (debouncedSearchRef.current) {
          clearTimeout(debouncedSearchRef.current)
        }
      }
    }, [])

    const leftIcon = loading ? (
      <Icon name="Loader2" size="sm" className="animate-spin" />
    ) : (
      <Icon name="Search" size="sm" />
    )

    const rightElement = (
      <div className="flex items-center gap-1">
        {showVoiceInput && (
          <VoiceInputButton
            onTranscription={handleVoiceTranscription}
            disabled={loading}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            aria-label="Voice search"
          />
        )}
        {showClearButton && internalValue && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleClear}
            className="h-4 w-4 p-0 hover:bg-transparent"
            aria-label="Clear search"
          >
            <Icon name="X" size="xs" />
          </Button>
        )}
        {showSearchButton && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleSearchClick}
            disabled={loading}
            className="h-6 w-6 p-0"
            aria-label="Search"
          >
            <Icon name="Search" size="sm" />
          </Button>
        )}
      </div>
    )

    return (
      <div className={cn("relative", className)}>
        <Input
          ref={ref}
          type="search"
          placeholder={placeholder}
          value={internalValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          leftIcon={leftIcon}
          rightIcon={rightElement}
          disabled={loading}
          {...props}
        />
      </div>
    )
  }
))

SearchInput.displayName = "SearchInput"

export { SearchInput }