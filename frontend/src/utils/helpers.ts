/**
 * Generate a unique ID (counter + random to guarantee uniqueness)
 */
let _uidCounter = 0
export function uid(): string {
  return (++_uidCounter).toString(36) + Math.random().toString(36).slice(2, 7)
}

/**
 * Get CSS class for HTTP method color
 */
export function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'text-method-get',
    POST: 'text-method-post',
    PUT: 'text-method-put',
    PATCH: 'text-method-patch',
    DELETE: 'text-method-delete',
    HEAD: 'text-method-head',
    OPTIONS: 'text-method-options',
  }
  return colors[method.toUpperCase()] || 'text-text-secondary'
}

/**
 * Truncate URL to specified length
 */
export function truncateUrl(url: string, maxLength: number = 40): string {
  if (url.length <= maxLength) return url
  return url.slice(0, maxLength) + '...'
}

/**
 * Format bytes to human-readable string
 */
export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
