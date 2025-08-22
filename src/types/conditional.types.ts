/**
 * Conditional Types for Advanced Type Transformations
 * Provides runtime and compile-time type logic
 */

// Conditional type utilities
export type NonNullable<T> = T extends null | undefined ? never : T;
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// Deep conditional types
export type DeepNonNullable<T> = T extends null | undefined 
  ? never 
  : T extends (infer U)[] 
    ? DeepNonNullable<U>[]
    : T extends object
      ? { [K in keyof T]: DeepNonNullable<T[K]> }
      : T;

export type DeepPartial<T> = T extends object 
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export type DeepRequired<T> = T extends object
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;

export type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

// API Response conditionals
export type ApiResponse<T> = T extends { success: true }
  ? { success: true; data: T; error?: never }
  : { success: false; data?: never; error: ApiError };

export type ApiResult<T, E = ApiError> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Permission-based conditional types
export type AuthorizedResource<T, P extends string> = P extends `${string}:admin`
  ? T & { _permissions: 'admin' }
  : P extends `${string}:write`
    ? Omit<T, 'delete' | 'admin'> & { _permissions: 'write' }
    : P extends `${string}:read`
      ? Pick<T, 'id' | 'name' | 'createdAt'> & { _permissions: 'read' }
      : never;

// Form field conditionals
export type FormField<T> = T extends string
  ? { type: 'text'; value: T; validation: StringValidation }
  : T extends number
    ? { type: 'number'; value: T; validation: NumberValidation }
    : T extends boolean
      ? { type: 'checkbox'; value: T }
      : T extends Date
        ? { type: 'date'; value: T; validation: DateValidation }
        : T extends string[]
          ? { type: 'multiselect'; value: T; options: string[] }
          : { type: 'unknown'; value: T };

// Database query conditionals
export type QueryResult<T, M extends 'single' | 'multiple'> = M extends 'single'
  ? T | null
  : T[];

export type QueryFilter<T> = {
  [K in keyof T]?: T[K] extends string
    ? string | { contains: string } | { startsWith: string } | { endsWith: string }
    : T[K] extends number
      ? number | { gt: number } | { gte: number } | { lt: number } | { lte: number }
      : T[K] extends Date
        ? Date | { before: Date } | { after: Date } | { between: [Date, Date] }
        : T[K] extends boolean
          ? boolean
          : T[K];
};

// Event handler conditionals
export type EventHandler<T> = T extends keyof HTMLElementEventMap
  ? (event: HTMLElementEventMap[T]) => void | Promise<void>
  : T extends keyof WindowEventMap
    ? (event: WindowEventMap[T]) => void | Promise<void>
    : (event: CustomEvent) => void | Promise<void>;

// Component prop conditionals
export type ComponentProps<T> = T extends 'button'
  ? ButtonProps
  : T extends 'input'
    ? InputProps
    : T extends 'select'
      ? SelectProps
      : T extends 'modal'
        ? ModalProps
        : BaseProps;

// File type conditionals
export type FileHandler<T extends string> = T extends `image/${string}`
  ? ImageFileHandler
  : T extends `video/${string}`
    ? VideoFileHandler
    : T extends `application/pdf`
      ? PdfFileHandler
      : T extends `text/${string}`
        ? TextFileHandler
        : DefaultFileHandler;

// Route parameter conditionals
export type RouteHandler<T extends string> = T extends `/api/${infer Path}`
  ? ApiRouteHandler<Path>
  : T extends `/dashboard/${infer Page}`
    ? DashboardPageHandler<Page>
    : T extends `/auth/${infer Action}`
      ? AuthHandler<Action>
      : DefaultRouteHandler;

// State management conditionals
export type StateAction<T, A extends string> = A extends 'SET'
  ? { type: 'SET'; payload: T }
  : A extends 'UPDATE'
    ? { type: 'UPDATE'; payload: Partial<T> }
    : A extends 'RESET'
      ? { type: 'RESET' }
      : A extends 'DELETE'
        ? { type: 'DELETE'; id: string }
        : never;

export type StateReducer<T> = (
  state: T,
  action: StateAction<T, 'SET'> | StateAction<T, 'UPDATE'> | StateAction<T, 'RESET'> | StateAction<T, 'DELETE'>
) => T;

// Validation conditionals
export type ValidationRule<T> = T extends string
  ? StringValidationRule
  : T extends number
    ? NumberValidationRule
    : T extends boolean
      ? BooleanValidationRule
      : T extends Date
        ? DateValidationRule
        : T extends unknown[]
          ? ArrayValidationRule<T[0]>
          : T extends object
            ? ObjectValidationRule<T>
            : never;

export type ValidationResult<T> = T extends { required: true }
  ? { isValid: boolean; errors: string[]; value: NonNullable<T> }
  : { isValid: boolean; errors: string[]; value: T | null };

// Async operation conditionals
export type AsyncOperation<T, E = Error> = Promise<
  T extends { error: infer Err }
    ? { success: false; error: Err }
    : { success: true; data: T }
>;

export type CacheStrategy<T> = T extends { cacheable: true }
  ? { strategy: 'cache-first' | 'network-first'; ttl: number }
  : { strategy: 'network-only' };

// Configuration conditionals
export type Config<E extends 'development' | 'production' | 'test'> = 
  E extends 'development'
    ? DevConfig
    : E extends 'production'
      ? ProdConfig
      : E extends 'test'
        ? TestConfig
        : never;

// Utility type for extracting conditional branches
export type ExtractType<T, U> = T extends U ? T : never;
export type ExcludeType<T, U> = T extends U ? never : T;

// Advanced conditional utilities
export type If<Condition extends boolean, Then, Else> = Condition extends true ? Then : Else;

export type And<A extends boolean, B extends boolean> = A extends true
  ? B extends true
    ? true
    : false
  : false;

export type Or<A extends boolean, B extends boolean> = A extends true
  ? true
  : B extends true
    ? true
    : false;

export type Not<A extends boolean> = A extends true ? false : true;

// Type-level string conditionals
export type StartsWith<T extends string, U extends string> = T extends `${U}${string}` ? true : false;
export type EndsWith<T extends string, U extends string> = T extends `${string}${U}` ? true : false;
export type Includes<T extends string, U extends string> = T extends `${string}${U}${string}` ? true : false;

// Supporting interfaces
interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

interface StringValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  required?: boolean;
}

interface NumberValidation {
  min?: number;
  max?: number;
  required?: boolean;
  integer?: boolean;
}

interface DateValidation {
  min?: Date;
  max?: Date;
  required?: boolean;
}

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
}

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

interface SelectProps {
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  multiple?: boolean;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large';
}

interface BaseProps {
  className?: string;
  id?: string;
}

interface ImageFileHandler {
  generateThumbnail: (file: File) => Promise<string>;
  extractMetadata: (file: File) => Promise<ImageMetadata>;
}

interface VideoFileHandler {
  generatePreview: (file: File) => Promise<string>;
  extractDuration: (file: File) => Promise<number>;
}

interface PdfFileHandler {
  extractText: (file: File) => Promise<string>;
  generateThumbnails: (file: File) => Promise<string[]>;
}

interface TextFileHandler {
  parseContent: (file: File) => Promise<string>;
  detectEncoding: (file: File) => Promise<string>;
}

interface DefaultFileHandler {
  getBasicInfo: (file: File) => Promise<FileMetadata>;
}

interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  hasTransparency: boolean;
}

interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: Date;
}

type ApiRouteHandler<T extends string> = (req: Request, params: { path: T }) => Promise<Response>;
type DashboardPageHandler<T extends string> = React.ComponentType<{ page: T }>;
type AuthHandler<T extends string> = (action: T) => Promise<void>;
type DefaultRouteHandler = React.ComponentType;

interface StringValidationRule {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

interface NumberValidationRule {
  min?: number;
  max?: number;
  integer?: boolean;
}

interface BooleanValidationRule {
  // Boolean fields rarely need validation rules
}

interface DateValidationRule {
  min?: Date;
  max?: Date;
  future?: boolean;
  past?: boolean;
}

interface ArrayValidationRule<T> {
  minItems?: number;
  maxItems?: number;
  unique?: boolean;
  itemValidation?: ValidationRule<T>;
}

interface ObjectValidationRule<T> {
  properties: { [K in keyof T]?: ValidationRule<T[K]> };
  required?: (keyof T)[];
}

interface DevConfig {
  debug: true;
  hotReload: true;
  apiUrl: string;
  mockData: true;
}

interface ProdConfig {
  debug: false;
  hotReload: false;
  apiUrl: string;
  mockData: false;
  analytics: true;
}

interface TestConfig {
  debug: true;
  hotReload: false;
  apiUrl: string;
  mockData: true;
  testDb: true;
}

// Type guard helpers
export const isSuccess = <T, E>(result: ApiResult<T, E>): result is { success: true; data: T } =>
  result.success === true;

export const isError = <T, E>(result: ApiResult<T, E>): result is { success: false; error: E } =>
  result.success === false;

export const hasPermission = <T, P extends string>(
  resource: AuthorizedResource<T, P>, 
  permission: P
): resource is AuthorizedResource<T, P> => {
  return '_permissions' in resource && resource._permissions === permission.split(':')[1];
};