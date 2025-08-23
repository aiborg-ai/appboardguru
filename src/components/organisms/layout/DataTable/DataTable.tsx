import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "../../atoms/Button"
import { Input } from "../../atoms/Input"
import { Icon, type IconName } from "../../atoms/Icon"
import { Badge } from "../../atoms/Badge"
import { SearchInput } from "../../../molecules/SearchInput/SearchInput"

// Context for sharing state between compound components
interface DataTableContextValue {
  columns: Column[]
  data: Record<string, unknown>[]
  filteredData: Record<string, unknown>[]
  sortColumn: string | null
  sortDirection: 'asc' | 'desc'
  searchQuery: string
  selectedRows: Set<string>
  setSortColumn: (column: string | null) => void
  setSortDirection: (direction: 'asc' | 'desc') => void
  setSearchQuery: (query: string) => void
  toggleRowSelection: (id: string) => void
  toggleAllRows: () => void
}

const DataTableContext = React.createContext<DataTableContextValue | null>(null)

const useDataTableContext = () => {
  const context = React.useContext(DataTableContext)
  if (!context) {
    throw new Error('DataTable components must be used within a DataTable')
  }
  return context
}

// Column definition
export interface Column {
  key: string
  label: string
  sortable?: boolean
  searchable?: boolean
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
  width?: string | number
  align?: 'left' | 'center' | 'right'
}

export interface DataTableProps {
  data: Record<string, unknown>[]
  columns: Column[]
  keyField?: string
  searchable?: boolean
  selectable?: boolean
  onRowClick?: (row: Record<string, unknown>) => void
  onSelectionChange?: (selectedIds: string[]) => void
  className?: string
  children?: React.ReactNode
}

// Custom hook for table logic
const useDataTable = ({ data, columns, keyField = 'id', searchable = true }: {
  data: Record<string, unknown>[]
  columns: Column[]
  keyField: string
  searchable: boolean
}) => {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())

  // Memoized filtered and sorted data
  const filteredData = React.useMemo(() => {
    let filtered = [...data]

    // Apply search filter
    if (searchable && searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(row => 
        columns
          .filter(col => col.searchable !== false)
          .some(col => {
            const value = row[col.key]
            return String(value || '').toLowerCase().includes(query)
          })
      )
    }

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]
        
        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1

        // Convert to strings for comparison
        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()

        if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1
        if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [data, columns, searchQuery, sortColumn, sortDirection, searchable])

  const toggleRowSelection = React.useCallback((id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const toggleAllRows = React.useCallback(() => {
    setSelectedRows(prev => {
      if (prev.size === filteredData.length) {
        return new Set()
      } else {
        return new Set(filteredData.map(row => String(row[keyField])))
      }
    })
  }, [filteredData, keyField])

  const handleSort = React.useCallback((columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }, [sortColumn])

  return {
    filteredData,
    sortColumn,
    sortDirection,
    searchQuery,
    selectedRows,
    setSortColumn,
    setSortDirection,
    setSearchQuery,
    toggleRowSelection,
    toggleAllRows,
    handleSort,
  }
}

// Main DataTable component
const DataTable = React.memo<DataTableProps>(({
  data,
  columns,
  keyField = 'id',
  searchable = true,
  selectable = false,
  onRowClick,
  onSelectionChange,
  className,
  children,
}) => {
  const tableLogic = useDataTable({ data, columns, keyField, searchable })

  // Notify parent of selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(Array.from(tableLogic.selectedRows))
    }
  }, [tableLogic.selectedRows, onSelectionChange])

  const contextValue: DataTableContextValue = React.useMemo(() => ({
    columns,
    data,
    ...tableLogic,
  }), [columns, data, tableLogic])

  return (
    <DataTableContext.Provider value={contextValue}>
      <div className={cn("space-y-4", className)}>
        {children}
      </div>
    </DataTableContext.Provider>
  )
})

// Search component
const DataTableSearch: React.FC<{ placeholder?: string; className?: string }> = React.memo(({
  placeholder = "Search...",
  className,
}) => {
  const { searchQuery, setSearchQuery } = useDataTableContext()

  return (
    <div className={cn(className)}>
      <SearchInput
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onSearch={setSearchQuery}
        className="max-w-sm"
      />
    </div>
  )
})

// Table component
const DataTableTable: React.FC<{ className?: string }> = React.memo(({ className }) => {
  const {
    columns,
    filteredData,
    sortColumn,
    sortDirection,
    selectedRows,
    toggleRowSelection,
    toggleAllRows,
    setSortColumn,
    setSortDirection,
  } = useDataTableContext()

  const handleSort = React.useCallback((columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }, [sortColumn, sortDirection, setSortColumn, setSortDirection])

  return (
    <div className={cn("rounded-md border overflow-hidden", className)}>
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-2 text-left">
              <input
                type="checkbox"
                checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                onChange={toggleAllRows}
                className="rounded"
              />
            </th>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "p-2 text-left font-medium",
                  column.sortable !== false && "cursor-pointer hover:bg-muted/80",
                  column.align === 'center' && "text-center",
                  column.align === 'right' && "text-right"
                )}
                style={{ width: column.width }}
                onClick={() => column.sortable !== false && handleSort(column.key)}
              >
                <div className="flex items-center gap-1">
                  {column.label}
                  {column.sortable !== false && (
                    <Icon
                      name={
                        sortColumn === column.key
                          ? sortDirection === 'asc'
                            ? 'ChevronUp'
                            : 'ChevronDown'
                          : 'ChevronsUpDown'
                      }
                      size="sm"
                      className="opacity-50"
                    />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row, index) => {
            const rowId = String(row.id || index)
            const isSelected = selectedRows.has(rowId)
            
            return (
              <tr
                key={rowId}
                className={cn(
                  "hover:bg-muted/50 transition-colors",
                  isSelected && "bg-accent/50"
                )}
              >
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRowSelection(rowId)}
                    className="rounded"
                  />
                </td>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "p-2",
                      column.align === 'center' && "text-center",
                      column.align === 'right' && "text-right"
                    )}
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key] || '')
                    }
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>

      {filteredData.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No data available
        </div>
      )}
    </div>
  )
})

// Stats component
const DataTableStats: React.FC<{ className?: string }> = React.memo(({ className }) => {
  const { data, filteredData, selectedRows } = useDataTableContext()

  return (
    <div className={cn("flex items-center gap-4 text-sm text-muted-foreground", className)}>
      <span>
        Showing {filteredData.length} of {data.length} records
      </span>
      {selectedRows.size > 0 && (
        <Badge variant="outline" className="text-xs">
          {selectedRows.size} selected
        </Badge>
      )}
    </div>
  )
})

// Compound component exports
DataTable.Search = DataTableSearch
DataTable.Table = DataTableTable  
DataTable.Stats = DataTableStats

export { DataTable, type Column }