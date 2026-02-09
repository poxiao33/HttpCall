import type { CompareRequest } from '../types/compare'
import { uid } from './helpers'

// ─── Shared types ───

export interface ParsedRequest {
  method: string
  url: string
  headers: Array<{ key: string; value: string }>
  cookies: Array<{ key: string; value: string }>
  body: string
}

// ─── cURL parser ───

/** Detect if input uses Windows CMD escaping (^" instead of ") */
function isWindowsCmdFormat(input: string): boolean {
  return /\^"/.test(input) || /\^\s*\r?\n/.test(input)
}

/** Normalize Windows CMD curl to Unix-style shell format */
function normalizeWindowsCmd(input: string): string {
  let result = ''
  let i = 0
  while (i < input.length) {
    if (input[i] === '^') {
      // ^ at end of line = line continuation
      if (i + 1 < input.length && input[i + 1] === '\n') {
        i += 2
        while (i < input.length && (input[i] === ' ' || input[i] === '\t')) i++
      } else if (i + 2 < input.length && input[i + 1] === '\r' && input[i + 2] === '\n') {
        i += 3
        while (i < input.length && (input[i] === ' ' || input[i] === '\t')) i++
      } else if (i + 1 < input.length) {
        // ^X = literal X (^" → ", ^\ → \, ^^ → ^)
        result += input[i + 1]
        i += 2
      } else {
        result += '^'
        i++
      }
    } else {
      result += input[i]
      i++
    }
  }
  return result
}

/** Tokenize a shell command string, handling quotes, escapes, and line continuations */
export function tokenizeShellArgs(input: string): string[] {
  const args: string[] = []
  let current = ''
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (ch === "'") {
      i++
      while (i < input.length && input[i] !== "'") {
        current += input[i]
        i++
      }
      i++
    } else if (ch === '"') {
      i++
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < input.length && (input[i + 1] === '"' || input[i + 1] === '\\')) {
          current += input[i + 1]
          i += 2
        } else {
          current += input[i]
          i++
        }
      }
      i++
    } else if (ch === '\\' && i + 1 < input.length) {
      if (input[i + 1] === '\n') {
        i += 2
        while (i < input.length && (input[i] === ' ' || input[i] === '\t')) i++
      } else {
        current += input[i + 1]
        i += 2
      }
    } else if (ch === ' ' || ch === '\t' || ch === '\n') {
      if (current) { args.push(current); current = '' }
      i++
    } else {
      current += ch
      i++
    }
  }
  if (current) args.push(current)
  return args
}

const NO_VALUE_FLAGS = new Set([
  '-k', '--insecure', '-L', '--location', '--compressed',
  '-s', '--silent', '-v', '--verbose', '-i', '--include',
  '-S', '--show-error', '-N', '--no-buffer',
])

export { type ParsedRequest as ParsedCurlCommand }

/** Parse a cURL command into a generic result */
export function parseCurlCommand(input: string): ParsedRequest | null {
  let trimmed = input.trim()
  if (isWindowsCmdFormat(trimmed)) {
    trimmed = normalizeWindowsCmd(trimmed)
  }
  if (!trimmed.startsWith('curl')) return null

  const args = tokenizeShellArgs(trimmed)
  let method = 'GET'
  let url = ''
  const headers: Array<{ key: string; value: string }> = []
  const cookies: Array<{ key: string; value: string }> = []
  let body = ''
  let hasExplicitMethod = false
  let hasBody = false

  let i = 1
  while (i < args.length) {
    const arg = args[i]
    if (arg === '-X' || arg === '--request') {
      i++
      if (i < args.length) { method = args[i].toUpperCase(); hasExplicitMethod = true }
    } else if (arg === '-H' || arg === '--header') {
      i++
      if (i < args.length) {
        const colonIdx = args[i].indexOf(':')
        if (colonIdx > 0) {
          const key = args[i].slice(0, colonIdx).trim()
          const value = args[i].slice(colonIdx + 1).trim()
          if (!key.startsWith(':')) headers.push({ key, value })
        }
      }
    } else if (arg === '-d' || arg === '--data' || arg === '--data-raw' || arg === '--data-binary' || arg === '--data-urlencode') {
      i++
      if (i < args.length) { body = args[i]; hasBody = true }
    } else if (arg === '-b' || arg === '--cookie') {
      i++
      if (i < args.length) {
        args[i].split(';').forEach(pair => {
          const eqIdx = pair.indexOf('=')
          if (eqIdx > 0) {
            cookies.push({ key: pair.slice(0, eqIdx).trim(), value: pair.slice(eqIdx + 1).trim() })
          }
        })
      }
    } else if (arg === '-A' || arg === '--user-agent') {
      i++
      if (i < args.length) headers.push({ key: 'User-Agent', value: args[i] })
    } else if (arg === '-e' || arg === '--referer') {
      i++
      if (i < args.length) headers.push({ key: 'Referer', value: args[i] })
    } else if (arg.startsWith('-')) {
      if (!NO_VALUE_FLAGS.has(arg) && i + 1 < args.length && !args[i + 1].startsWith('-')) i++
    } else if (!url) {
      url = arg
    }
    i++
  }

  if (hasBody && !hasExplicitMethod) method = 'POST'
  if (!url) return null
  return { method, url, headers, cookies, body }
}

// ─── Raw HTTP request parser ───

const RAW_HTTP_RE = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT)\s+(\S+)(?:\s+HTTP\/[\d.]+)?$/

/** Detect if input looks like a raw HTTP request */
function isRawHttp(input: string): boolean {
  const firstLine = input.trimStart().split('\n')[0].trim()
  return RAW_HTTP_RE.test(firstLine)
}

/** Parse a raw HTTP request (e.g. from browser dev tools / Burp Suite) */
export function parseRawHttp(input: string): ParsedRequest | null {
  const trimmed = input.trim()
  // Split headers from body: first blank line is the separator
  const blankLineIdx = trimmed.search(/\n\s*\n/)
  const headerSection = blankLineIdx >= 0 ? trimmed.slice(0, blankLineIdx) : trimmed
  const body = blankLineIdx >= 0 ? trimmed.slice(blankLineIdx).replace(/^\n\s*\n/, '') : ''

  const lines = headerSection.split('\n').map(l => l.trimEnd())
  if (lines.length === 0) return null

  // Parse request line: METHOD PATH HTTP/VERSION
  const requestLine = lines[0].trim()
  const match = RAW_HTTP_RE.exec(requestLine)
  if (!match) return null

  const method = match[1]
  const pathOrUrl = match[2]

  // Parse headers
  const headers: Array<{ key: string; value: string }> = []
  const cookies: Array<{ key: string; value: string }> = []
  let host = ''

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const colonIdx = line.indexOf(':')
    if (colonIdx <= 0) continue

    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()

    if (key.toLowerCase() === 'host') {
      host = value
    } else if (key.toLowerCase() === 'cookie') {
      // Parse cookie header into individual cookies
      value.split(';').forEach(pair => {
        const eqIdx = pair.indexOf('=')
        if (eqIdx > 0) {
          cookies.push({ key: pair.slice(0, eqIdx).trim(), value: pair.slice(eqIdx + 1).trim() })
        }
      })
    } else {
      headers.push({ key, value })
    }
  }

  // Construct full URL
  let url: string
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    url = pathOrUrl
  } else if (host) {
    const scheme = host.endsWith(':80') ? 'http' : 'https'
    url = `${scheme}://${host}${pathOrUrl}`
  } else {
    return null // Can't construct URL without host
  }

  return { method, url, headers, cookies, body: body.trim() }
}

// ─── Unified parser ───

/** Auto-detect format and parse: supports cURL and raw HTTP */
export function parseRequestText(input: string): ParsedRequest | null {
  const trimmed = input.trim()
  if (trimmed.startsWith('curl')) {
    return parseCurlCommand(trimmed)
  }
  if (isRawHttp(trimmed)) {
    return parseRawHttp(trimmed)
  }
  return null
}

/** Parse a single request text into a CompareRequest (auto-detect format) */
export function parseRequest(input: string): CompareRequest | null {
  const parsed = parseRequestText(input)
  if (!parsed) return null
  return parsedToCompareRequest(parsed)
}

/** Parse multiple cURL commands - split on 'curl' at the start of a line */
function parseMultipleCurls(text: string): CompareRequest[] {
  // Split on 'curl' keyword at the start of a line (handles multi-line quoted values with blank lines)
  const parts = text.split(/(?=^curl\s)/m).filter(p => p.trim())
  const results: CompareRequest[] = []
  for (const part of parts) {
    const parsed = parseCurlCommand(part.trim())
    if (parsed) results.push(parsedToCompareRequest(parsed))
  }
  return results
}

/** Parse multiple requests: cURL (blank-line separated) or raw HTTP (auto-detect) */
export function parseMultipleRequests(text: string): CompareRequest[] {
  const trimmed = text.trim()

  // If starts with curl, split on blank lines between commands
  if (trimmed.startsWith('curl')) {
    return parseMultipleCurls(trimmed)
  }

  // For raw HTTP, a single request uses blank line as header/body separator
  // Multiple raw HTTP requests are separated by lines starting with a method
  if (isRawHttp(trimmed)) {
    return splitRawHttpRequests(trimmed)
  }

  return []
}

/** Split multiple raw HTTP requests and parse each */
function splitRawHttpRequests(text: string): CompareRequest[] {
  const results: CompareRequest[] = []
  const lines = text.split('\n')
  let currentBlock: string[] = []
  let seenBlankLine = false
  let lastLineBlank = false

  for (const line of lines) {
    const trimmedLine = line.trim()
    const isRequestLine = RAW_HTTP_RE.test(trimmedLine)

    // Start a new request when: we see a request line after a blank line,
    // and the current block already has a header/body separator (blank line).
    // This prevents splitting within a single request's body.
    if (isRequestLine && lastLineBlank && currentBlock.length > 0 && seenBlankLine) {
      // Remove trailing blank lines from current block
      while (currentBlock.length > 0 && !currentBlock[currentBlock.length - 1].trim()) {
        currentBlock.pop()
      }
      const parsed = parseRawHttp(currentBlock.join('\n'))
      if (parsed) results.push(parsedToCompareRequest(parsed))
      currentBlock = []
      seenBlankLine = false
    }

    if (trimmedLine === '' && currentBlock.length > 0) {
      seenBlankLine = true
    }

    lastLineBlank = trimmedLine === ''
    currentBlock.push(line)
  }

  // Flush last block
  if (currentBlock.length > 0) {
    while (currentBlock.length > 0 && !currentBlock[currentBlock.length - 1].trim()) {
      currentBlock.pop()
    }
    if (currentBlock.length > 0) {
      const parsed = parseRawHttp(currentBlock.join('\n'))
      if (parsed) results.push(parsedToCompareRequest(parsed))
    }
  }

  return results
}

/** Convert ParsedRequest to CompareRequest */
function parsedToCompareRequest(parsed: ParsedRequest): CompareRequest {
  const params: Record<string, string> = {}
  try {
    const urlObj = new URL(parsed.url)
    urlObj.searchParams.forEach((value, key) => { params[key] = value })
  } catch {
    // Invalid URL
  }

  const headersMap: Record<string, string> = {}
  parsed.headers.forEach(h => { headersMap[h.key] = h.value })

  const cookiesMap: Record<string, string> = {}
  parsed.cookies.forEach(c => { cookiesMap[c.key] = c.value })

  return {
    id: uid(),
    method: parsed.method,
    url: parsed.url,
    params,
    headers: headersMap,
    cookies: cookiesMap,
    body: parsed.body,
  }
}
