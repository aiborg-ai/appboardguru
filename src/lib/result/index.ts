/**
 * Result Pattern Main Export
 * Functional error handling system
 */

// Core types and constructors
export * from './types'
export { Ok, Err, Result, AppErrorFactory, match, matchAsync } from './result'
export { Some, None, Option, matchOption, matchOptionAsync } from './option'
export { ResultHandlers, createResultAPIHandler } from './apiHandler'

// Re-export for convenience
export type { Result as ResultType, Option as OptionType, AppError } from './types'