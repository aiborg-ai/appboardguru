/**
 * Jest global types declaration
 */
import '@jest/globals'

declare global {
  const jest: typeof import('@jest/globals').jest
}

export {}