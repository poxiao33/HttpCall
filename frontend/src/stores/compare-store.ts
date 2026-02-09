import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { CompareRequest, CompareParam } from '../types/compare'

// Helper function to parse JSON body and extract fields
function parseJsonBody(body: string): Record<string, string> {
  try {
    const parsed = JSON.parse(body) as unknown
    const result: Record<string, string> = {}

    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null && !Array.isArray(value)

    const stringifyLeaf = (value: unknown): string => {
      if (typeof value === 'string') return value
      if (value === undefined) return ''
      if (value === null) return 'null'
      if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return String(value)
      }
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    }

    function flatten(obj: Record<string, unknown>, prefix = '', depth = 0): void {
      if (depth > 20) return
      for (const key of Object.keys(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key
        const value = obj[key]

        if (isRecord(value)) {
          flatten(value, newKey, depth + 1)
        } else if (Array.isArray(value)) {
          value.forEach((item, index: number) => {
            if (isRecord(item)) {
              flatten(item, `${newKey}[${index}]`, depth + 1)
            } else {
              result[`${newKey}[${index}]`] = stringifyLeaf(item)
            }
          })
        } else {
          result[newKey] = stringifyLeaf(value)
        }
      }
    }

    if (isRecord(parsed)) {
      flatten(parsed)
    }
    return result
  } catch {
    return {}
  }
}

// Helper function to compute comparison results
function computeCompareResults(requests: CompareRequest[]): Record<string, CompareParam[]> {
  if (requests.length === 0) {
    return {}
  }

  const results: Record<string, CompareParam[]> = {
    query: [],
    headers: [],
    cookie: [],
    body: [],
    responseHeaders: [],
    responseBody: [],
  }

  // Collect all unique keys for each dimension
  const allKeys: Record<string, Set<string>> = {
    query: new Set(),
    headers: new Set(),
    cookie: new Set(),
    body: new Set(),
    responseHeaders: new Set(),
    responseBody: new Set(),
  }

  requests.forEach(req => {
    Object.keys(req.params).forEach(key => allKeys.query.add(key))
    Object.keys(req.headers).forEach(key => allKeys.headers.add(key))
    Object.keys(req.cookies).forEach(key => allKeys.cookie.add(key))

    if (req.body) {
      const bodyFields = parseJsonBody(req.body)
      Object.keys(bodyFields).forEach(key => allKeys.body.add(key))
    }

    if (req.response) {
      Object.keys(req.response.headers).forEach(key => allKeys.responseHeaders.add(key))
      if (req.response.body) {
        const bodyFields = parseJsonBody(req.response.body)
        if (Object.keys(bodyFields).length > 0) {
          Object.keys(bodyFields).forEach(key => allKeys.responseBody.add(key))
        } else {
          allKeys.responseBody.add('(raw)')
        }
      }
    }
  })

  // Build comparison arrays for each dimension
  allKeys.query.forEach(key => {
    results.query.push({
      name: key,
      values: requests.map(req => key in req.params ? req.params[key] : '-')
    })
  })

  allKeys.headers.forEach(key => {
    results.headers.push({
      name: key,
      values: requests.map(req => key in req.headers ? req.headers[key] : '-')
    })
  })

  allKeys.cookie.forEach(key => {
    results.cookie.push({
      name: key,
      values: requests.map(req => key in req.cookies ? req.cookies[key] : '-')
    })
  })

  allKeys.body.forEach(key => {
    results.body.push({
      name: key,
      values: requests.map(req => {
        if (!req.body) return '-'
        const bodyFields = parseJsonBody(req.body)
        return bodyFields[key] ?? '-'
      })
    })
  })

  allKeys.responseHeaders.forEach(key => {
    results.responseHeaders.push({
      name: key,
      values: requests.map(req => req.response?.headers[key] ?? '-')
    })
  })

  allKeys.responseBody.forEach(key => {
    results.responseBody.push({
      name: key,
      values: requests.map(req => {
        if (!req.response?.body) return '-'
        if (key === '(raw)') {
          return req.response.body.slice(0, 500)
        }
        const bodyFields = parseJsonBody(req.response.body)
        return bodyFields[key] ?? '-'
      })
    })
  })

  return results
}

interface CompareState {
  requests: CompareRequest[]
  activeDimension: string
  addRequest: (req: CompareRequest) => void
  removeRequest: (id: string) => void
  setDimension: (dim: string) => void
  clearRequests: () => void
  getResults: () => CompareParam[]
}

export const useCompareStore = create<CompareState>()(
  immer((set, get) => ({
    requests: [],
    activeDimension: 'query',

    addRequest: (req) => set((s) => { s.requests.push(req) }),
    removeRequest: (id) => set((s) => {
      s.requests = s.requests.filter((r) => r.id !== id)
    }),
    setDimension: (dim) => set((s) => { s.activeDimension = dim }),
    clearRequests: () => set((s) => { s.requests = [] }),

    getResults: () => {
      const state = get()
      const allResults = computeCompareResults(state.requests)
      return allResults[state.activeDimension] || []
    },
  }))
)
