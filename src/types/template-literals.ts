/**
 * Template Literal Types for Enhanced String Type Safety
 * Provides compile-time validation for string patterns
 */

// Route patterns
export type RoutePattern = 
  | '/dashboard'
  | '/dashboard/assets'
  | '/dashboard/assets/{id}'
  | '/dashboard/vaults'
  | '/dashboard/vaults/{id}'
  | '/dashboard/organizations'
  | '/dashboard/organizations/{id}'
  | '/dashboard/boardmates'
  | '/dashboard/calendar'
  | '/dashboard/notifications'
  | '/dashboard/settings'
  | '/auth/login'
  | '/auth/signup'
  | '/auth/reset-password';

// API endpoint patterns
export type ApiEndpoint = 
  | `/api/assets`
  | `/api/assets/${string}`
  | `/api/assets/${string}/download`
  | `/api/assets/${string}/annotations`
  | `/api/vaults`
  | `/api/vaults/${string}`
  | `/api/vaults/${string}/assets`
  | `/api/organizations`
  | `/api/organizations/${string}`
  | `/api/organizations/${string}/members`
  | `/api/auth/login`
  | `/api/auth/logout`
  | `/api/auth/refresh`
  | `/api/user/profile`
  | `/api/search`;

// Environment variable patterns
export type EnvVarName = 
  | `NEXT_PUBLIC_${string}`
  | `SUPABASE_${string}`
  | `DATABASE_${string}`
  | `OPENAI_${string}`
  | `SMTP_${string}`
  | `REDIS_${string}`;

// CSS class name patterns
export type TailwindClass = 
  | `text-${string}`
  | `bg-${string}`
  | `border-${string}`
  | `p-${number}`
  | `m-${number}`
  | `w-${number | string}`
  | `h-${number | string}`
  | `flex-${string}`
  | `grid-${string}`
  | `rounded-${string}`
  | `shadow-${string}`
  | `hover:${string}`
  | `focus:${string}`
  | `active:${string}`
  | `disabled:${string}`;

// File path patterns
export type AssetPath = `assets/${string}`;
export type ComponentPath = `components/${string}`;
export type PagePath = `pages/${string}`;
export type ApiPath = `api/${string}`;
export type TypePath = `types/${string}`;

// MIME type patterns
export type ImageMimeType = `image/${'jpeg' | 'png' | 'gif' | 'webp' | 'svg+xml'}`;
export type DocumentMimeType = `application/${'pdf' | 'msword' | 'vnd.openxmlformats-officedocument.wordprocessingml.document'}`;
export type TextMimeType = `text/${'plain' | 'csv' | 'html' | 'markdown'}`;
export type VideoMimeType = `video/${'mp4' | 'webm' | 'ogg'}`;
export type AudioMimeType = `audio/${'mp3' | 'wav' | 'ogg' | 'flac'}`;

export type SupportedMimeType = ImageMimeType | DocumentMimeType | TextMimeType | VideoMimeType | AudioMimeType;

// Color patterns
export type HexColor = `#${string}`;
export type RgbColor = `rgb(${number}, ${number}, ${number})`;
export type RgbaColor = `rgba(${number}, ${number}, ${number}, ${number})`;
export type HslColor = `hsl(${number}, ${number}%, ${number}%)`;
export type HslaColor = `hsla(${number}, ${number}%, ${number}%, ${number})`;

export type CssColor = HexColor | RgbColor | RgbaColor | HslColor | HslaColor | 
  'transparent' | 'currentColor' | 'inherit' | 'initial' | 'unset';

// Version patterns
export type SemanticVersion = `${number}.${number}.${number}`;
export type SemanticVersionWithPre = `${number}.${number}.${number}-${string}`;
export type SemanticVersionWithBuild = `${number}.${number}.${number}+${string}`;
export type FullSemanticVersion = `${number}.${number}.${number}-${string}+${string}`;

export type Version = SemanticVersion | SemanticVersionWithPre | SemanticVersionWithBuild | FullSemanticVersion;

// HTTP method patterns
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

// Status code patterns
export type SuccessStatusCode = `2${0 | 1}${number}`;
export type RedirectStatusCode = `3${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}${number}`;
export type ClientErrorStatusCode = `4${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}${number}`;
export type ServerErrorStatusCode = `5${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}${number}`;

export type StatusCode = SuccessStatusCode | RedirectStatusCode | ClientErrorStatusCode | ServerErrorStatusCode;

// Event name patterns
export type DomEventType = 
  | `on${Capitalize<keyof HTMLElementEventMap>}`
  | `on${Capitalize<keyof WindowEventMap>}`;

export type CustomEventType = `custom:${string}`;
export type ApiEventType = `api:${string}`;
export type WebSocketEventType = `ws:${string}`;

export type EventType = DomEventType | CustomEventType | ApiEventType | WebSocketEventType;

// SQL table name patterns
export type TableName = 
  | 'users'
  | 'organizations' 
  | 'vaults'
  | 'assets'
  | 'notifications'
  | 'vault_invitations'
  | 'asset_annotations'
  | 'organization_members'
  | `${string}_audit`
  | `${string}_history`;

// Permission patterns
export type Permission = 
  | `${string}:read`
  | `${string}:write` 
  | `${string}:delete`
  | `${string}:admin`
  | `org:${string}`
  | `vault:${string}`
  | `asset:${string}`;

// Metric name patterns
export type MetricName = 
  | `counter.${string}`
  | `gauge.${string}`
  | `histogram.${string}`
  | `timer.${string}`
  | `api.${string}.${HttpMethod}.${number}`
  | `db.${string}.query.${string}`
  | `cache.${string}.${string}`;

// Log level patterns
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogMessage = `[${LogLevel}] ${string}`;

// Feature flag patterns
export type FeatureFlag = 
  | `feature.${string}.enabled`
  | `experiment.${string}.variant`
  | `rollout.${string}.percentage`;

// Cache key patterns
export type CacheKey = 
  | `user:${string}`
  | `org:${string}`
  | `vault:${string}`
  | `asset:${string}`
  | `search:${string}:${string}`
  | `session:${string}`
  | `rate_limit:${string}:${string}`;

// Configuration key patterns
export type ConfigKey = 
  | `app.${string}`
  | `database.${string}`
  | `cache.${string}`
  | `auth.${string}`
  | `storage.${string}`
  | `email.${string}`
  | `search.${string}`;

// Utility types for template literals
export type ExtractRouteParams<T extends string> = T extends `${string}{${infer P}}${infer Rest}`
  ? P | ExtractRouteParams<Rest>
  : never;

export type RouteParams<T extends RoutePattern> = {
  [K in ExtractRouteParams<T>]: string;
};

// Validation helpers
export const isValidRoute = (path: string): path is RoutePattern => {
  const validRoutes: RoutePattern[] = [
    '/dashboard',
    '/dashboard/assets',
    '/dashboard/assets/{id}',
    '/dashboard/vaults',
    '/dashboard/vaults/{id}',
    '/dashboard/organizations',
    '/dashboard/organizations/{id}',
    '/dashboard/boardmates',
    '/dashboard/calendar',
    '/dashboard/notifications',
    '/dashboard/settings',
    '/auth/login',
    '/auth/signup',
    '/auth/reset-password'
  ];
  
  return validRoutes.includes(path as RoutePattern);
};

export const isValidApiEndpoint = (endpoint: string): endpoint is ApiEndpoint => {
  return endpoint.startsWith('/api/') && endpoint.length > 5;
};

export const isValidMimeType = (mimeType: string): mimeType is SupportedMimeType => {
  const supportedTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents  
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Text
    'text/plain', 'text/csv', 'text/html', 'text/markdown',
    // Video
    'video/mp4', 'video/webm', 'video/ogg',
    // Audio
    'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac'
  ];
  
  return supportedTypes.includes(mimeType as SupportedMimeType);
};

export const isValidSemanticVersion = (version: string): version is Version => {
  const semVerRegex = /^\d+\.\d+\.\d+(-[\w\.-]+)?(\+[\w\.-]+)?$/;
  return semVerRegex.test(version);
};

export const isValidHexColor = (color: string): color is HexColor => {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
};

// Builder functions for type-safe string construction
export const buildApiEndpoint = <T extends string>(path: T): `/api/${T}` => `/api/${path}`;

export const buildRouteWithParams = <T extends RoutePattern>(
  route: T, 
  params: RouteParams<T>
): string => {
  let result: string = route;
  
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`{${key}}`, value);
  }
  
  return result;
};

export const buildCacheKey = <T extends string, U extends string>(
  prefix: T, 
  suffix: U
): `${T}:${U}` => `${prefix}:${suffix}`;

export const buildMetricName = <T extends string>(
  type: 'counter' | 'gauge' | 'histogram' | 'timer',
  name: T
): MetricName => `${type}.${name}` as MetricName;