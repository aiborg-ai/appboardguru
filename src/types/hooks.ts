/**
 * Hooks Type Definitions
 * Type definitions for custom React hooks
 */

import { DependencyList, MutableRefObject } from 'react'

// Base Hook Types
export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export interface AsyncOptions {
  immediate?: boolean
  onSuccess?: (data: unknown) => void
  onError?: (error: Error) => void
}

// Data Fetching Hook Types
export interface UseAsyncReturn<T> extends AsyncState<T> {
  execute: (...args: any[]) => Promise<void>
  reset: () => void
  mutate: (data: T | ((prev: T | null) => T)) => void
}

export interface UseFetchOptions<T> extends AsyncOptions {
  dependencies?: DependencyList
  refetchOnWindowFocus?: boolean
  refetchInterval?: number
  cacheKey?: string
  cacheTime?: number
  staleTime?: number
  initialData?: T
  enabled?: boolean
  retry?: number | boolean
  retryDelay?: number | ((attempt: number) => number)
  select?: (data: unknown) => T
  onSettled?: (data: T | null, error: Error | null) => void
}

export interface UseFetchReturn<T> extends AsyncState<T> {
  refetch: () => Promise<void>
  mutate: (data: T | ((prev: T | null) => T)) => void
  isFetching: boolean
  isStale: boolean
  dataUpdatedAt: number
  errorUpdatedAt: number
  lastSuccessAt?: number
}

// Mutation Hook Types
export interface UseMutationOptions<TData, TVariables> extends AsyncOptions {
  onMutate?: (variables: TVariables) => void | Promise<void>
  onSettled?: (data: TData | null, error: Error | null, variables: TVariables) => void
  retry?: number | boolean
  retryDelay?: number | ((attempt: number) => number)
}

export interface UseMutationReturn<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>
  mutateAsync: (variables: TVariables) => Promise<TData>
  reset: () => void
  data: TData | null
  loading: boolean
  error: string | null
  isIdle: boolean
  isSuccess: boolean
  isError: boolean
}

// Local Storage Hook Types
export interface UseLocalStorageOptions<T> {
  defaultValue?: T
  serialize?: (value: T) => string
  deserialize?: (value: string) => T
  syncAcrossTabs?: boolean
}

export interface UseLocalStorageReturn<T> {
  value: T
  setValue: (value: T | ((prev: T) => T)) => void
  removeValue: () => void
}

// Session Storage Hook Types
export interface UseSessionStorageReturn<T> {
  value: T
  setValue: (value: T | ((prev: T) => T)) => void
  removeValue: () => void
}

// Form Hook Types
export interface UseFormField<T> {
  value: T
  onChange: (value: T) => void
  onBlur: () => void
  error?: string
  touched: boolean
  dirty: boolean
}

export interface UseFormOptions<T> {
  initialValues: T
  validationSchema?: any
  onSubmit?: (values: T) => void | Promise<void>
  validateOnChange?: boolean
  validateOnBlur?: boolean
  enableReinitialize?: boolean
}

export interface UseFormReturn<T> {
  values: T
  errors: { [K in keyof T]?: string }
  touched: { [K in keyof T]?: boolean }
  dirty: { [K in keyof T]?: boolean }
  isSubmitting: boolean
  isValidating: boolean
  isValid: boolean
  submitCount: number
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void
  setFieldError: <K extends keyof T>(field: K, error: string) => void
  setFieldTouched: <K extends keyof T>(field: K, touched?: boolean) => void
  setValues: (values: T) => void
  setErrors: (errors: { [K in keyof T]?: string }) => void
  setTouched: (touched: { [K in keyof T]?: boolean }) => void
  validateField: <K extends keyof T>(field: K) => Promise<void>
  validateForm: () => Promise<void>
  resetForm: (values?: T) => void
  submitForm: () => Promise<void>
  handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => void
  getFieldProps: <K extends keyof T>(name: K) => UseFormField<T[K]>
}

// Debounce Hook Types
export interface UseDebounceReturn<T> {
  debouncedValue: T
  cancel: () => void
  flush: () => void
}

// Throttle Hook Types
export interface UseThrottleReturn<T> {
  throttledValue: T
  cancel: () => void
}

// Interval Hook Types
export interface UseIntervalOptions {
  immediate?: boolean
  callback?: () => void
}

// Timeout Hook Types
export interface UseTimeoutReturn {
  start: () => void
  stop: () => void
  reset: () => void
  isActive: boolean
}

// Previous Hook Types
export type UsePreviousReturn<T> = T | undefined

// Toggle Hook Types
export interface UseToggleReturn {
  value: boolean
  toggle: () => void
  setTrue: () => void
  setFalse: () => void
}

// Counter Hook Types
export interface UseCounterOptions {
  min?: number
  max?: number
  step?: number
}

export interface UseCounterReturn {
  count: number
  increment: (step?: number) => void
  decrement: (step?: number) => void
  set: (value: number) => void
  reset: () => void
}

// Array Hook Types
export interface UseArrayReturn<T> {
  value: T[]
  push: (item: T) => void
  pop: () => T | undefined
  shift: () => T | undefined
  unshift: (item: T) => void
  removeIndex: (index: number) => void
  removeValue: (item: T) => void
  insert: (index: number, item: T) => void
  clear: () => void
  move: (from: number, to: number) => void
  filter: (predicate: (item: T, index: number) => boolean) => void
  sort: (compareFn?: (a: T, b: T) => number) => void
  reverse: () => void
  set: (array: T[]) => void
}

// Boolean Hook Types
export interface UseBooleanReturn {
  value: boolean
  setValue: (value: boolean) => void
  setTrue: () => void
  setFalse: () => void
  toggle: () => void
}

// Map Hook Types
export interface UseMapReturn<K, V> {
  value: Map<K, V>
  set: (key: K, value: V) => void
  get: (key: K) => V | undefined
  has: (key: K) => boolean
  delete: (key: K) => void
  clear: () => void
  size: number
  keys: () => IterableIterator<K>
  values: () => IterableIterator<V>
  entries: () => IterableIterator<[K, V]>
}

// Set Hook Types
export interface UseSetReturn<T> {
  value: Set<T>
  add: (value: T) => void
  has: (value: T) => boolean
  delete: (value: T) => void
  clear: () => void
  size: number
  values: () => IterableIterator<T>
}

// Clipboard Hook Types
export interface UseClipboardReturn {
  copy: (text: string) => Promise<void>
  copied: boolean
  error: string | null
}

// Media Query Hook Types
export interface UseMediaQueryReturn {
  matches: boolean
}

// Window Size Hook Types
export interface UseWindowSizeReturn {
  width: number
  height: number
}

// Scroll Hook Types
export interface UseScrollReturn {
  x: number
  y: number
}

// Element Size Hook Types
export interface UseElementSizeReturn {
  width: number
  height: number
  ref: MutableRefObject<HTMLElement | null>
}

// Hover Hook Types
export interface UseHoverReturn {
  isHovered: boolean
  ref: MutableRefObject<HTMLElement | null>
}

// Focus Hook Types
export interface UseFocusReturn {
  isFocused: boolean
  ref: MutableRefObject<HTMLElement | null>
}

// Click Outside Hook Types
export interface UseClickOutsideReturn {
  ref: MutableRefObject<HTMLElement | null>
}

// Key Press Hook Types
export interface UseKeyPressReturn {
  isPressed: boolean
}

// Geolocation Hook Types
export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

export interface UseGeolocationReturn {
  location: {
    latitude: number
    longitude: number
    accuracy: number
    altitude?: number
    altitudeAccuracy?: number
    heading?: number
    speed?: number
  } | null
  loading: boolean
  error: GeolocationPositionError | null
  getCurrentPosition: () => void
}

// Battery Hook Types
export interface UseBatteryReturn {
  charging: boolean
  chargingTime: number
  dischargingTime: number
  level: number
}

// Network Hook Types
export interface UseNetworkReturn {
  online: boolean
  downlink?: number
  downlinkMax?: number
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g'
  rtt?: number
  saveData?: boolean
  type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown'
}

// Permission Hook Types
export interface UsePermissionReturn {
  state: PermissionState
  error: string | null
  request: () => Promise<void>
}

// Idle Hook Types
export interface UseIdleOptions {
  timeout?: number
  events?: string[]
  initialState?: boolean
}

export interface UseIdleReturn {
  isIdle: boolean
  lastActive: Date | null
}

// Undo/Redo Hook Types
export interface UseHistoryReturn<T> {
  state: T
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  go: (step: number) => void
  reset: (initialState: T) => void
  set: (state: T) => void
}

// Pagination Hook Types
export interface UsePaginationOptions {
  total: number
  pageSize?: number
  current?: number
  onChange?: (page: number, pageSize: number) => void
}

export interface UsePaginationReturn {
  current: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  next: () => void
  prev: () => void
  jump: (page: number) => void
  setPageSize: (size: number) => void
  setTotal: (total: number) => void
}

// Search Hook Types
export interface UseSearchOptions<T> {
  keys?: string[]
  threshold?: number
  caseSensitive?: boolean
  includeScore?: boolean
  includeMatches?: boolean
}

export interface UseSearchReturn<T> {
  results: T[]
  search: (query: string) => void
  clear: () => void
  query: string
}

// Drag and Drop Hook Types
export interface UseDragReturn {
  isDragging: boolean
  dragRef: MutableRefObject<HTMLElement | null>
  previewRef: MutableRefObject<HTMLElement | null>
}

export interface UseDropReturn<T> {
  isOver: boolean
  canDrop: boolean
  dropRef: MutableRefObject<HTMLElement | null>
  drop: (item: T) => void
}

// WebSocket Hook Types
export interface UseWebSocketOptions {
  onOpen?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  onMessage?: (event: MessageEvent) => void
  onError?: (event: Event) => void
  protocols?: string | string[]
  reconnectAttempts?: number
  reconnectInterval?: number
}

export interface UseWebSocketReturn {
  send: (data: string | ArrayBuffer | Blob) => void
  lastMessage: MessageEvent | null
  readyState: number
  connect: () => void
  disconnect: () => void
}

// Event Source Hook Types
export interface UseEventSourceOptions {
  withCredentials?: boolean
}

export interface UseEventSourceReturn {
  data: any
  error: Event | null
  status: number
}

// Intersection Observer Hook Types
export interface UseIntersectionObserverOptions {
  threshold?: number | number[]
  root?: Element | null
  rootMargin?: string
}

export interface UseIntersectionObserverReturn {
  isIntersecting: boolean
  entry: IntersectionObserverEntry | null
  ref: MutableRefObject<HTMLElement | null>
}

// Resize Observer Hook Types
export interface UseResizeObserverReturn {
  ref: MutableRefObject<HTMLElement | null>
  width: number
  height: number
  entry: ResizeObserverEntry | null
}

// Mutation Observer Hook Types
export interface UseMutationObserverOptions {
  childList?: boolean
  attributes?: boolean
  characterData?: boolean
  subtree?: boolean
  attributeOldValue?: boolean
  characterDataOldValue?: boolean
  attributeFilter?: string[]
}

export interface UseMutationObserverReturn {
  ref: MutableRefObject<HTMLElement | null>
  mutations: MutationRecord[]
}