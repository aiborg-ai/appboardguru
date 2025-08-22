'use client'

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle
} from 'react'
import { cn } from '@/lib/utils'
import { ScrollArea } from './scroll-area'

// Types
export interface VirtualScrollListItem {
  id: string | number
  data: any
}

export interface VirtualScrollListProps<T = any> {
  items: VirtualScrollListItem[]
  itemHeight?: number | ((index: number, item: VirtualScrollListItem) => number)
  itemComponent: React.ComponentType<{
    item: VirtualScrollListItem
    index: number
    style: React.CSSProperties
  }>
  height?: number | string
  width?: number | string
  overscan?: number
  className?: string
  onScroll?: (scrollTop: number, scrollLeft: number) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loading?: boolean
  loadMoreThreshold?: number
  estimatedItemHeight?: number
  horizontal?: boolean
  enableSelection?: boolean
  selectedItems?: Set<string | number>
  onSelectionChange?: (selectedItems: Set<string | number>) => void
  enableKeyboardNavigation?: boolean
  searchTerm?: string
  onItemClick?: (item: VirtualScrollListItem, index: number) => void
}

export interface VirtualScrollListRef {
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => void
  scrollToItem: (itemId: string | number, align?: 'start' | 'center' | 'end' | 'auto') => void
  getVisibleRange: () => [number, number]
  invalidateCache: () => void
}

// Custom hook for dynamic item heights
function useItemSizes<T>(
  items: VirtualScrollListItem[],
  itemHeight: number | ((index: number, item: VirtualScrollListItem) => number),
  estimatedItemHeight: number
) {
  const [measuredHeights, setMeasuredHeights] = useState<Map<number, number>>(new Map())
  
  const getItemHeight = useCallback((index: number): number => {
    if (typeof itemHeight === 'function') {
      // Check if we have a measured height
      if (measuredHeights.has(index)) {
        return measuredHeights.get(index)!
      }
      // Use the function to calculate height
      return itemHeight(index, items[index]) || estimatedItemHeight
    }
    return itemHeight
  }, [itemHeight, items, measuredHeights, estimatedItemHeight])

  const measureItem = useCallback((index: number, height: number) => {
    setMeasuredHeights(prev => {
      if (prev.get(index) !== height) {
        const newMap = new Map(prev)
        newMap.set(index, height)
        return newMap
      }
      return prev
    })
  }, [])

  const invalidateCache = useCallback(() => {
    setMeasuredHeights(new Map())
  }, [])

  return { getItemHeight, measureItem, invalidateCache }
}

// Individual item wrapper component
interface VirtualItemProps {
  item: VirtualScrollListItem
  index: number
  style: React.CSSProperties
  ItemComponent: React.ComponentType<any>
  onMeasure?: (index: number, height: number) => void
  isSelected?: boolean
  onSelect?: () => void
  onClick?: () => void
}

const VirtualItem = React.memo(({ 
  item, 
  index, 
  style, 
  ItemComponent, 
  onMeasure,
  isSelected,
  onSelect,
  onClick
}: VirtualItemProps) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && onMeasure) {
      const height = ref.current.offsetHeight
      onMeasure(index, height)
    }
  })

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      onSelect?.()
    } else {
      onClick?.()
    }
  }, [onSelect, onClick])

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        'virtual-list-item',
        isSelected && 'ring-2 ring-blue-500 bg-blue-50'
      )}
      onClick={handleClick}
      role="option"
      aria-selected={isSelected}
      tabIndex={-1}
    >
      <ItemComponent item={item} index={index} style={{}} />
    </div>
  )
})

VirtualItem.displayName = 'VirtualItem'

export const VirtualScrollList = forwardRef<VirtualScrollListRef, VirtualScrollListProps>(
  ({
    items,
    itemHeight = 50,
    itemComponent: ItemComponent,
    height = 400,
    width = '100%',
    overscan = 5,
    className,
    onScroll,
    onLoadMore,
    hasMore = false,
    loading = false,
    loadMoreThreshold = 5,
    estimatedItemHeight = 50,
    horizontal = false,
    enableSelection = false,
    selectedItems = new Set(),
    onSelectionChange,
    enableKeyboardNavigation = true,
    searchTerm,
    onItemClick
  }, ref) => {
    const [scrollTop, setScrollTop] = useState(0)
    const [scrollLeft, setScrollLeft] = useState(0)
    const [containerHeight, setContainerHeight] = useState(0)
    const [containerWidth, setContainerWidth] = useState(0)
    const [focusedIndex, setFocusedIndex] = useState<number>(-1)
    
    const scrollElementRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    
    const { getItemHeight, measureItem, invalidateCache } = useItemSizes(
      items,
      itemHeight,
      estimatedItemHeight
    )

    // Filter items based on search term
    const filteredItems = useMemo(() => {
      if (!searchTerm) return items
      
      return items.filter(item => {
        const searchableText = JSON.stringify(item.data).toLowerCase()
        return searchableText.includes(searchTerm.toLowerCase())
      })
    }, [items, searchTerm])

    // Calculate total size and item offsets
    const { totalSize, itemOffsets } = useMemo(() => {
      let totalSize = 0
      const offsets: number[] = []
      
      for (let i = 0; i < filteredItems.length; i++) {
        offsets[i] = totalSize
        totalSize += getItemHeight(i)
      }
      
      return { totalSize, itemOffsets: offsets }
    }, [filteredItems.length, getItemHeight])

    // Calculate visible range
    const visibleRange = useMemo(() => {
      if (!filteredItems.length) return [0, 0]
      
      const containerSize = horizontal ? containerWidth : containerHeight
      const scrollPos = horizontal ? scrollLeft : scrollTop
      
      let startIndex = 0
      let endIndex = filteredItems.length - 1
      
      // Binary search for start index
      let low = 0
      let high = filteredItems.length - 1
      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const offset = itemOffsets[mid]
        if (offset < scrollPos) {
          low = mid + 1
        } else {
          high = mid - 1
        }
      }
      startIndex = Math.max(0, high)
      
      // Find end index
      let currentOffset = itemOffsets[startIndex]
      for (let i = startIndex; i < filteredItems.length; i++) {
        if (currentOffset > scrollPos + containerSize) {
          endIndex = i
          break
        }
        currentOffset += getItemHeight(i)
      }
      
      // Apply overscan
      startIndex = Math.max(0, startIndex - overscan)
      endIndex = Math.min(filteredItems.length - 1, endIndex + overscan)
      
      return [startIndex, endIndex]
    }, [
      filteredItems.length,
      horizontal,
      containerWidth,
      containerHeight,
      scrollLeft,
      scrollTop,
      itemOffsets,
      getItemHeight,
      overscan
    ])

    // Handle scroll events
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      const newScrollTop = target.scrollTop
      const newScrollLeft = target.scrollLeft
      
      setScrollTop(newScrollTop)
      setScrollLeft(newScrollLeft)
      onScroll?.(newScrollTop, newScrollLeft)

      // Check if we need to load more items
      if (hasMore && !loading && onLoadMore) {
        const scrollableHeight = target.scrollHeight - target.clientHeight
        const threshold = scrollableHeight - (loadMoreThreshold * estimatedItemHeight)
        
        if (newScrollTop >= threshold) {
          onLoadMore()
        }
      }
    }, [onScroll, hasMore, loading, onLoadMore, loadMoreThreshold, estimatedItemHeight])

    // Handle container resize
    useEffect(() => {
      if (!containerRef.current) return
      
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          setContainerWidth(width)
          setContainerHeight(height)
        }
      })
      
      resizeObserver.observe(containerRef.current)
      return () => resizeObserver.disconnect()
    }, [])

    // Keyboard navigation
    useEffect(() => {
      if (!enableKeyboardNavigation || !containerRef.current) return

      const handleKeyDown = (e: KeyboardEvent) => {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            setFocusedIndex(prev => Math.min(filteredItems.length - 1, prev + 1))
            break
          case 'ArrowUp':
            e.preventDefault()
            setFocusedIndex(prev => Math.max(0, prev - 1))
            break
          case 'Home':
            e.preventDefault()
            setFocusedIndex(0)
            break
          case 'End':
            e.preventDefault()
            setFocusedIndex(filteredItems.length - 1)
            break
          case ' ':
          case 'Enter':
            e.preventDefault()
            if (focusedIndex >= 0 && focusedIndex < filteredItems.length) {
              onItemClick?.(filteredItems[focusedIndex], focusedIndex)
            }
            break
        }
      }

      const container = containerRef.current
      container.addEventListener('keydown', handleKeyDown)
      return () => container.removeEventListener('keydown', handleKeyDown)
    }, [enableKeyboardNavigation, filteredItems, focusedIndex, onItemClick])

    // Scroll focused item into view
    useEffect(() => {
      if (focusedIndex >= 0 && focusedIndex < filteredItems.length) {
        const itemOffset = itemOffsets[focusedIndex]
        const itemHeight = getItemHeight(focusedIndex)
        const viewportStart = scrollTop
        const viewportEnd = scrollTop + containerHeight

        if (itemOffset < viewportStart) {
          // Scroll up to show item
          scrollElementRef.current?.scrollTo({
            top: itemOffset,
            behavior: 'smooth'
          })
        } else if (itemOffset + itemHeight > viewportEnd) {
          // Scroll down to show item
          scrollElementRef.current?.scrollTo({
            top: itemOffset + itemHeight - containerHeight,
            behavior: 'smooth'
          })
        }
      }
    }, [focusedIndex, itemOffsets, getItemHeight, scrollTop, containerHeight])

    // Render visible items
    const visibleItems = useMemo(() => {
      const [startIndex, endIndex] = visibleRange
      const items: React.ReactNode[] = []
      
      for (let i = startIndex; i <= endIndex; i++) {
        const item = filteredItems[i]
        if (!item) continue
        
        const offset = itemOffsets[i]
        const size = getItemHeight(i)
        
        const style: React.CSSProperties = horizontal
          ? {
              position: 'absolute',
              left: offset,
              top: 0,
              width: size,
              height: containerHeight
            }
          : {
              position: 'absolute',
              top: offset,
              left: 0,
              width: '100%',
              height: size
            }

        const isSelected = enableSelection && selectedItems.has(item.id)
        const isFocused = enableKeyboardNavigation && focusedIndex === i

        items.push(
          <VirtualItem
            key={`${item.id}-${i}`}
            item={item}
            index={i}
            style={style}
            ItemComponent={ItemComponent}
            onMeasure={typeof itemHeight === 'function' ? measureItem : undefined}
            isSelected={isSelected || isFocused}
            onSelect={enableSelection ? () => {
              const newSelection = new Set(selectedItems)
              if (selectedItems.has(item.id)) {
                newSelection.delete(item.id)
              } else {
                newSelection.add(item.id)
              }
              onSelectionChange?.(newSelection)
            } : undefined}
            onClick={() => {
              setFocusedIndex(i)
              onItemClick?.(item, i)
            }}
          />
        )
      }
      
      return items
    }, [
      visibleRange,
      filteredItems,
      itemOffsets,
      getItemHeight,
      horizontal,
      containerHeight,
      enableSelection,
      selectedItems,
      enableKeyboardNavigation,
      focusedIndex,
      ItemComponent,
      measureItem,
      itemHeight,
      onSelectionChange,
      onItemClick
    ])

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      scrollToIndex: (index: number, align: 'start' | 'center' | 'end' | 'auto' = 'auto') => {
        if (index < 0 || index >= filteredItems.length) return
        
        const offset = itemOffsets[index]
        const itemSize = getItemHeight(index)
        const containerSize = horizontal ? containerWidth : containerHeight
        
        let scrollTo = offset
        
        switch (align) {
          case 'center':
            scrollTo = offset - (containerSize - itemSize) / 2
            break
          case 'end':
            scrollTo = offset - containerSize + itemSize
            break
          case 'auto':
            const currentScroll = horizontal ? scrollLeft : scrollTop
            if (offset < currentScroll) {
              scrollTo = offset
            } else if (offset + itemSize > currentScroll + containerSize) {
              scrollTo = offset - containerSize + itemSize
            } else {
              return // Already visible
            }
            break
        }
        
        scrollElementRef.current?.scrollTo({
          [horizontal ? 'left' : 'top']: Math.max(0, scrollTo),
          behavior: 'smooth'
        })
      },
      
      scrollToItem: (itemId: string | number, align = 'auto') => {
        const index = filteredItems.findIndex(item => item.id === itemId)
        if (index >= 0) {
          return ref.current?.scrollToIndex(index, align)
        }
      },
      
      getVisibleRange: () => visibleRange as [number, number],
      
      invalidateCache
    }), [
      filteredItems,
      itemOffsets,
      getItemHeight,
      horizontal,
      containerWidth,
      containerHeight,
      scrollLeft,
      scrollTop,
      visibleRange,
      invalidateCache
    ])

    const containerStyle: React.CSSProperties = {
      height,
      width,
      position: 'relative',
      overflow: 'hidden'
    }

    const innerStyle: React.CSSProperties = horizontal
      ? {
          position: 'relative',
          width: totalSize,
          height: '100%',
          minHeight: containerHeight
        }
      : {
          position: 'relative',
          height: totalSize,
          width: '100%',
          minWidth: containerWidth
        }

    return (
      <div
        ref={containerRef}
        className={cn('virtual-scroll-list', className)}
        style={containerStyle}
        tabIndex={enableKeyboardNavigation ? 0 : -1}
        role="listbox"
        aria-multiselectable={enableSelection}
      >
        <ScrollArea className="h-full w-full">
          <div
            ref={scrollElementRef}
            onScroll={handleScroll}
            className="h-full w-full overflow-auto"
            style={{ height, width }}
          >
            <div style={innerStyle}>
              {visibleItems}
              {loading && (
                <div
                  className="flex items-center justify-center p-4"
                  style={{
                    position: 'absolute',
                    [horizontal ? 'left' : 'top']: totalSize,
                    [horizontal ? 'top' : 'left']: 0,
                    [horizontal ? 'height' : 'width']: '100%',
                    [horizontal ? 'width' : 'height']: 100
                  }}
                >
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  <span className="ml-2 text-sm text-gray-600">Loading...</span>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    )
  }
)

VirtualScrollList.displayName = 'VirtualScrollList'

export default VirtualScrollList