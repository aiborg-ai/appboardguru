/**
 * Data Visualization Types
 * Type definitions for charts, graphs, and data visualization components
 */

import { ReactNode, CSSProperties, HTMLAttributes } from 'react'

// Base Chart Types
export type ChartType = 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter' | 'heatmap' | 'gauge' | 'funnel' | 'radar'

export interface ChartDataPoint {
  x: string | number | Date
  y: number
  label?: string
  color?: string
  metadata?: Record<string, any>
}

export interface ChartSeries {
  name: string
  data: ChartDataPoint[]
  color?: string
  type?: ChartType
  visible?: boolean
}

// Chart Configuration
export interface ChartConfig {
  type: ChartType
  data: ChartSeries[]
  width?: number | string
  height?: number | string
  responsive?: boolean
  maintainAspectRatio?: boolean
  animation?: {
    enabled: boolean
    duration: number
    easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear'
  }
  colors?: string[]
  theme?: 'light' | 'dark'
}

// Chart Component Props
export interface BaseChartProps {
  config: ChartConfig
  title?: string
  subtitle?: string
  loading?: boolean
  error?: string
  noDataMessage?: string
  className?: string
  style?: CSSProperties
  onDataPointClick?: (point: ChartDataPoint, series: ChartSeries) => void
  onLegendClick?: (series: ChartSeries) => void
}

// Line Chart Types
export interface LineChartProps extends BaseChartProps {
  showPoints?: boolean
  pointSize?: number
  strokeWidth?: number
  curved?: boolean
  showGrid?: boolean
  showXAxis?: boolean
  showYAxis?: boolean
  xAxisLabel?: string
  yAxisLabel?: string
}

// Bar Chart Types
export interface BarChartProps extends BaseChartProps {
  orientation?: 'horizontal' | 'vertical'
  showValues?: boolean
  barWidth?: number
  spacing?: number
  stacked?: boolean
  showGrid?: boolean
  showXAxis?: boolean
  showYAxis?: boolean
  xAxisLabel?: string
  yAxisLabel?: string
}

// Pie Chart Types
export interface PieChartProps extends BaseChartProps {
  innerRadius?: number
  outerRadius?: number
  showLabels?: boolean
  showValues?: boolean
  showPercentages?: boolean
  labelPosition?: 'inside' | 'outside'
  donut?: boolean
}

// Area Chart Types
export interface AreaChartProps extends BaseChartProps {
  fillOpacity?: number
  strokeWidth?: number
  curved?: boolean
  stacked?: boolean
  showGrid?: boolean
  showXAxis?: boolean
  showYAxis?: boolean
  xAxisLabel?: string
  yAxisLabel?: string
}

// Scatter Chart Types
export interface ScatterChartProps extends BaseChartProps {
  pointSize?: number
  showTrendline?: boolean
  trendlineColor?: string
  showGrid?: boolean
  showXAxis?: boolean
  showYAxis?: boolean
  xAxisLabel?: string
  yAxisLabel?: string
}

// Gauge Chart Types
export interface GaugeChartProps extends Omit<BaseChartProps, 'config'> {
  value: number
  min: number
  max: number
  unit?: string
  segments?: Array<{
    min: number
    max: number
    color: string
    label?: string
  }>
  showValue?: boolean
  showLabels?: boolean
  thickness?: number
}

// Heatmap Types
export interface HeatmapDataPoint {
  x: string | number
  y: string | number
  value: number
  color?: string
  metadata?: Record<string, any>
}

export interface HeatmapProps extends Omit<BaseChartProps, 'config'> {
  data: HeatmapDataPoint[]
  colorScheme?: string[]
  showValues?: boolean
  cellSize?: number
  xAxisLabels?: string[]
  yAxisLabels?: string[]
}

// Funnel Chart Types
export interface FunnelDataPoint {
  name: string
  value: number
  color?: string
  metadata?: Record<string, any>
}

export interface FunnelChartProps extends Omit<BaseChartProps, 'config'> {
  data: FunnelDataPoint[]
  showValues?: boolean
  showPercentages?: boolean
  direction?: 'top-to-bottom' | 'bottom-to-top'
}

// Radar Chart Types
export interface RadarDataPoint {
  axis: string
  value: number
  max?: number
}

export interface RadarSeries {
  name: string
  data: RadarDataPoint[]
  color?: string
}

export interface RadarChartProps extends Omit<BaseChartProps, 'config'> {
  data: RadarSeries[]
  showGrid?: boolean
  showLabels?: boolean
  maxValue?: number
}

// KPI and Metrics Types
export interface KPIMetric {
  id: string
  title: string
  value: number | string
  previousValue?: number | string
  change?: {
    value: number
    percentage: number
    direction: 'up' | 'down' | 'neutral'
    period: string
  }
  target?: number
  unit?: string
  format?: 'number' | 'currency' | 'percentage' | 'duration'
  trend?: ChartDataPoint[]
  color?: string
  icon?: ReactNode
}

export interface KPICardProps {
  metric: KPIMetric
  size?: 'sm' | 'md' | 'lg'
  showTrend?: boolean
  showTarget?: boolean
  onClick?: (metric: KPIMetric) => void
  className?: string
}

export interface KPIGridProps {
  metrics: KPIMetric[]
  columns?: number
  size?: 'sm' | 'md' | 'lg'
  showTrends?: boolean
  onMetricClick?: (metric: KPIMetric) => void
  className?: string
}

// Dashboard Widget Types
export interface DashboardWidget {
  id: string
  title: string
  type: 'chart' | 'kpi' | 'table' | 'text' | 'custom'
  size: {
    width: number
    height: number
  }
  position: {
    x: number
    y: number
  }
  config: any
  refreshInterval?: number
  lastUpdated?: Date
  error?: string
  loading?: boolean
}

export interface DashboardLayout {
  id: string
  name: string
  widgets: DashboardWidget[]
  columns: number
  rowHeight: number
  margin: [number, number]
  padding: [number, number]
}

export interface DashboardProps {
  layout: DashboardLayout
  editable?: boolean
  onWidgetUpdate?: (widget: DashboardWidget) => void
  onWidgetDelete?: (widgetId: string) => void
  onWidgetAdd?: (widget: Omit<DashboardWidget, 'id'>) => void
  onLayoutChange?: (layout: DashboardLayout) => void
  className?: string
}

// Table/Grid Types for Data Display
export interface TableColumn<T = any> {
  key: string
  title: string
  dataIndex?: string
  render?: (value: any, record: T, index: number) => ReactNode
  sortable?: boolean
  filterable?: boolean
  width?: number | string
  align?: 'left' | 'center' | 'right'
  fixed?: 'left' | 'right'
  ellipsis?: boolean
}

export interface TableRowSelection<T = any> {
  type: 'checkbox' | 'radio'
  selectedRowKeys: string[]
  onChange: (selectedRowKeys: string[], selectedRows: T[]) => void
  getCheckboxProps?: (record: T) => { disabled?: boolean }
  hideSelectAll?: boolean
}

export interface TablePagination {
  current: number
  pageSize: number
  total: number
  showSizeChanger?: boolean
  showQuickJumper?: boolean
  showTotal?: (total: number, range: [number, number]) => ReactNode
  onChange: (page: number, pageSize: number) => void
}

export interface DataTableProps<T = any> {
  columns: TableColumn<T>[]
  dataSource: T[]
  loading?: boolean
  pagination?: TablePagination | false
  rowSelection?: TableRowSelection<T>
  expandable?: {
    expandedRowRender: (record: T, index: number) => ReactNode
    expandRowByClick?: boolean
  }
  scroll?: { x?: number; y?: number }
  size?: 'small' | 'middle' | 'large'
  bordered?: boolean
  showHeader?: boolean
  rowKey?: string | ((record: T) => string)
  onRow?: (record: T, index?: number) => HTMLAttributes<any>
  className?: string
}

// Filter and Search Types for Data
export interface FilterOption {
  label: string
  value: any
  count?: number
}

export interface ColumnFilter {
  columnKey: string
  filterType: 'text' | 'select' | 'date' | 'number' | 'range'
  options?: FilterOption[]
  placeholder?: string
}

export interface DataFilter {
  [columnKey: string]: any
}

export interface DataSort {
  columnKey: string
  direction: 'asc' | 'desc'
}

export interface DataQuery {
  filters: DataFilter
  sort: DataSort[]
  pagination: {
    page: number
    pageSize: number
  }
  search?: string
}

// Chart Interaction Types
export interface ChartInteraction {
  type: 'hover' | 'click' | 'select' | 'zoom' | 'pan'
  enabled: boolean
  callback?: (event: any, data: any) => void
}

export interface ChartTooltip {
  enabled: boolean
  format?: (value: any, series: ChartSeries, dataPoint: ChartDataPoint) => string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'follow'
  theme?: 'light' | 'dark'
}

export interface ChartLegend {
  enabled: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  layout?: 'horizontal' | 'vertical'
  itemStyle?: CSSProperties
}

// Advanced Chart Configuration
export interface AdvancedChartConfig extends ChartConfig {
  interactions?: ChartInteraction[]
  tooltip?: ChartTooltip
  legend?: ChartLegend
  axes?: {
    x?: {
      label?: string
      min?: number
      max?: number
      tickCount?: number
      format?: string
      grid?: boolean
    }
    y?: {
      label?: string
      min?: number
      max?: number
      tickCount?: number
      format?: string
      grid?: boolean
    }
  }
  annotations?: Array<{
    type: 'line' | 'area' | 'point' | 'text'
    value: any
    label?: string
    color?: string
    style?: CSSProperties
  }>
}

// Real-time Data Types
export interface RealTimeDataSource {
  connect: () => Promise<void>
  disconnect: () => void
  subscribe: (callback: (data: any) => void) => () => void
  isConnected: boolean
  lastUpdate?: Date
}

export interface RealTimeChartProps extends BaseChartProps {
  dataSource?: RealTimeDataSource
  maxDataPoints?: number
  updateInterval?: number
  autoScroll?: boolean
}

// Export Types
export interface ChartExportOptions {
  format: 'png' | 'jpg' | 'pdf' | 'svg'
  filename?: string
  width?: number
  height?: number
  quality?: number
}

export interface DataExportOptions {
  format: 'csv' | 'xlsx' | 'json'
  filename?: string
  columns?: string[]
  includeHeaders?: boolean
}