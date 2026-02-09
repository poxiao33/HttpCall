/**
 * Request Store - Manages HTTP request tabs and operations
 *
 * This store handles:
 * - Multiple request tabs (add, remove, switch, duplicate)
 * - Request configuration (method, URL, headers, body, auth)
 * - Request execution with TLS fingerprinting
 * - History integration
 *
 * Uses Zustand with Immer middleware for immutable state updates.
 *
 * @module request-store
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { HttpMethod, KeyValuePair, RequestConfig, AuthConfig, TabState, FormDataPair, ProxyConfig } from '../types/request'
import { sendRequest as wailsSendRequest } from '../utils/wails-bridge'
import { useTlsStore } from './tls-store'
import { useHistoryStore, type HistoryEntry } from './history-store'
import { uid } from '../utils/helpers'

/**
 * Builds a URL from base URL and params array
 * @param baseUrl - The base URL (may contain existing query params)
 * @param params - Array of key-value pairs to add as query params
 * @returns Complete URL with query string
 */
function buildUrlFromParams(baseUrl: string, params: KeyValuePair[]): string {
  try {
    const url = new URL(baseUrl)
    // Clear existing search params
    url.search = ''
    // Only add enabled params with non-empty keys
    for (const p of params) {
      if (p.enabled && p.key) {
        url.searchParams.append(p.key, p.value)
      }
    }
    return url.toString()
  } catch {
    // URL is invalid, manually construct
    const base = baseUrl.split('?')[0]
    const enabledParams = params.filter(p => p.enabled && p.key)
    if (enabledParams.length === 0) return base
    const qs = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
    return `${base}?${qs}`
  }
}

/**
 * Creates an empty key-value pair for params/headers/cookies
 * @returns New KeyValuePair with unique ID
 */
function emptyKv(): KeyValuePair {
  return { id: uid(), key: '', value: '', enabled: true }
}

/**
 * Creates an empty form data entry
 * @returns New FormDataPair with unique ID
 */
function emptyFormData(): FormDataPair {
  return { id: uid(), key: '', value: '', enabled: true, type: 'text' }
}

/**
 * Creates a default request configuration
 * @param overrides - Optional partial config to override defaults
 * @returns Complete RequestConfig with defaults
 */
function defaultRequest(overrides?: Partial<RequestConfig>): RequestConfig {
  return {
    name: 'Untitled',
    method: 'GET',
    url: '',
    params: [],
    headers: [
      { id: uid(), key: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', enabled: true },
    ],
    cookies: [],
    body: '',
    bodyType: 'none',
    formData: [],
    auth: { type: 'none' },
    proxy: { type: 'none', host: '', port: 8080 },
    followRedirects: true,
    maxRedirects: 5,
    ...overrides,
    id: uid(),
  }
}

/**
 * Creates a default tab state with a new request
 * @param overrides - Optional partial config for the request
 * @returns New TabState with default request
 */
function defaultTab(overrides?: Partial<RequestConfig>): TabState {
  return { request: defaultRequest(overrides), response: null, loading: false }
}

/**
 * Request store state and actions
 */
export interface RequestState {
  tabs: TabState[]
  activeTabId: string
  activePanel: string
  responseTab: string

  // Tab management
  addTab: (overrides?: Partial<RequestConfig>) => void
  removeTab: (id: string) => void
  switchTab: (id: string) => void
  duplicateTab: (id: string) => void
  renameTab: (id: string, name: string) => void
  reorderTab: (fromId: string, toId: string) => void
  setTabOrder: (orderedIds: string[]) => void
  loadFromHistory: (entry: HistoryEntry) => void

  // Panel navigation
  setActivePanel: (panel: string) => void
  setResponseTab: (tab: string) => void

  // Current tab operations
  setMethod: (method: HttpMethod) => void
  setUrl: (url: string) => void
  setBody: (body: string) => void
  setBodyType: (type: RequestConfig['bodyType']) => void
  setAuth: (auth: AuthConfig) => void
  setName: (name: string) => void
  updateParam: (id: string, field: 'key' | 'value' | 'enabled' | 'note', val: string | boolean) => void
  updateHeader: (id: string, field: 'key' | 'value' | 'enabled' | 'note', val: string | boolean) => void
  updateCookie: (id: string, field: 'key' | 'value' | 'enabled' | 'note', val: string | boolean) => void
  updateFormData: (id: string, updates: Partial<FormDataPair>) => void
  addParam: () => void
  addHeader: () => void
  addCookie: () => void
  addFormData: () => void
  removeParam: (id: string) => void
  removeHeader: (id: string) => void
  removeCookie: (id: string) => void
  removeFormData: (id: string) => void
  setCookies: (cookies: KeyValuePair[]) => void
  setHeaders: (headers: KeyValuePair[]) => void
  setFormData: (items: FormDataPair[]) => void
  setParamsFromUrl: (params: KeyValuePair[]) => void
  setProxy: (proxy?: ProxyConfig) => void
  setFollowRedirects: (follow: boolean) => void
  setMaxRedirects: (max: number) => void
  sendRequest: () => void

  // Helpers
  currentTab: () => TabState | undefined
}

export const useRequestStore = create<RequestState>()(
  immer((set, get) => {
    const initialTab = defaultTab()
    return {
    tabs: [initialTab],
    activeTabId: initialTab.request.id,
    activePanel: 'params',
    responseTab: 'body',

    currentTab: () => {
      const s = get()
      return s.tabs.find((t) => t.request.id === s.activeTabId)
    },

    addTab: (overrides) => set((s) => {
      const t = defaultTab(overrides)
      s.tabs.push(t)
      s.activeTabId = t.request.id
    }),

    removeTab: (id) => set((s) => {
      if (s.tabs.length <= 1) return
      const idx = s.tabs.findIndex((t) => t.request.id === id)
      if (idx < 0) return
      s.tabs.splice(idx, 1)
      if (s.activeTabId === id) {
        s.activeTabId = s.tabs[Math.min(idx, s.tabs.length - 1)].request.id
      }
      // Defensive: ensure activeTabId always points to a valid tab
      if (!s.tabs.some((t) => t.request.id === s.activeTabId)) {
        s.activeTabId = s.tabs[Math.min(idx, s.tabs.length - 1)].request.id
      }
    }),

    switchTab: (id) => set((s) => {
      if (s.tabs.some((t) => t.request.id === id)) {
        s.activeTabId = id
      }
    }),

    duplicateTab: (id) => set((s) => {
      const src = s.tabs.find((t) => t.request.id === id)
      if (!src) return
      const newReq = JSON.parse(JSON.stringify(src.request)) as RequestConfig
      newReq.id = uid()
      newReq.name = src.request.name + ' (copy)'
      const t: TabState = { request: newReq, response: null, loading: false }
      s.tabs.push(t)
      s.activeTabId = t.request.id
    }),

    renameTab: (id, name) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === id)
      if (t) t.request.name = name
    }),
    reorderTab: (fromId, toId) => set((s) => {
      const fromIdx = s.tabs.findIndex((t) => t.request.id === fromId)
      const toIdx = s.tabs.findIndex((t) => t.request.id === toId)
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return
      const [moved] = s.tabs.splice(fromIdx, 1)
      s.tabs.splice(toIdx, 0, moved)
    }),
    setTabOrder: (orderedIds) => set((s) => {
      const tabMap = new Map(s.tabs.map(t => [t.request.id, t]))
      const reordered = orderedIds.map(id => tabMap.get(id)).filter(Boolean) as typeof s.tabs
      if (reordered.length === s.tabs.length) s.tabs = reordered
    }),

    loadFromHistory: (entry) => set((s) => {
      // Deep clone to avoid Immer frozen object sharing between stores
      const cloned = JSON.parse(JSON.stringify(entry))
      const newRequest: RequestConfig = {
        id: uid(),
        name: `${cloned.method} ${cloned.url.split('/').pop() || 'Request'}`,
        method: cloned.method,
        url: cloned.url,
        params: cloned.params?.length ? cloned.params : (() => {
          try {
            const urlObj = new URL(cloned.url)
            return Array.from(urlObj.searchParams.entries()).map(([key, value]) => ({
              id: uid(), key, value, enabled: true,
            }))
          } catch { return [] }
        })(),
        headers: cloned.headers?.length ? cloned.headers : [{ id: uid(), key: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', enabled: true }],
        cookies: [],
        body: cloned.body,
        bodyType: cloned.body ? 'raw' : 'none',
        formData: [],
        auth: { type: 'none' },
        followRedirects: cloned.followRedirects ?? true,
        maxRedirects: cloned.maxRedirects ?? 5,
        proxy: cloned.proxy ?? { type: 'none', host: '', port: 8080 },
      }
      const newTab: TabState = {
        request: newRequest,
        response: cloned.response || null,
        loading: false,
      }
      s.tabs.push(newTab)
      s.activeTabId = newRequest.id

      // Restore TLS config if saved
      if (cloned.tlsConfig) {
        useTlsStore.getState().setPreset(cloned.tlsConfig.preset)
        if (cloned.tlsConfig.customJa3) useTlsStore.getState().setCustomJa3(cloned.tlsConfig.customJa3)
        if (cloned.tlsConfig.customJa4) useTlsStore.getState().setCustomJa4(cloned.tlsConfig.customJa4)
        if (cloned.tlsConfig.customAkamai) useTlsStore.getState().setCustomAkamai(cloned.tlsConfig.customAkamai)
      }
    }),

    setActivePanel: (panel) => set((s) => { s.activePanel = panel }),
    setResponseTab: (tab) => set((s) => { s.responseTab = tab }),

    setMethod: (method) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.method = method
    }),
    setUrl: (url) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) {
        t.request.url = url
        // Auto-update tab name when URL changes
        try {
          const urlObj = new URL(url)
          const pathPart = urlObj.pathname === '/' ? urlObj.hostname : urlObj.pathname.split('/').pop() || urlObj.hostname
          t.request.name = pathPart
        } catch {
          // URL is invalid, don't update name
        }
      }
    }),
    setBody: (body) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.body = body
    }),
    setBodyType: (type) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.bodyType = type
    }),
    setAuth: (auth) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.auth = auth
    }),
    setName: (name) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.name = name
    }),

    updateParam: (id, field, val) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (!t) return
      const item = t.request.params.find((p) => p.id === id)
      if (item) {
        if (field === 'enabled') {
          item.enabled = val as boolean
        } else if (field === 'key' || field === 'value' || field === 'note') {
          item[field] = val as string
        }
      }
      // Sync URL when param changes (note field doesn't affect URL)
      if (field !== 'note') {
        t.request.url = buildUrlFromParams(t.request.url, t.request.params)
      }
    }),
    updateHeader: (id, field, val) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (!t) return
      const item = t.request.headers.find((h) => h.id === id)
      if (item) {
        if (field === 'enabled') {
          item.enabled = val as boolean
        } else if (field === 'key' || field === 'value' || field === 'note') {
          item[field] = val as string
        }
      }
    }),
    updateCookie: (id, field, val) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (!t) return
      const item = t.request.cookies.find((c) => c.id === id)
      if (item) {
        if (field === 'enabled') {
          item.enabled = val as boolean
        } else if (field === 'key' || field === 'value' || field === 'note') {
          item[field] = val as string
        }
      }
    }),
    updateFormData: (id, updates) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (!t) return
      const idx = t.request.formData.findIndex((f: FormDataPair) => f.id === id)
      if (idx >= 0) {
        t.request.formData[idx] = { ...t.request.formData[idx], ...updates }
      }
    }),

    addParam: () => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.params.push(emptyKv())
    }),
    addHeader: () => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.headers.push(emptyKv())
    }),
    addCookie: () => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.cookies.push(emptyKv())
    }),
    addFormData: () => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.formData.push(emptyFormData())
    }),

    removeParam: (id) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) {
        t.request.params = t.request.params.filter((p: KeyValuePair) => p.id !== id)
        // Sync URL after removing param
        t.request.url = buildUrlFromParams(t.request.url, t.request.params)
      }
    }),
    removeHeader: (id) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.headers = t.request.headers.filter((h: KeyValuePair) => h.id !== id)
    }),
    removeCookie: (id) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.cookies = t.request.cookies.filter((c: KeyValuePair) => c.id !== id)
    }),
    removeFormData: (id) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.formData = t.request.formData.filter((f: FormDataPair) => f.id !== id)
    }),
    setCookies: (cookies) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.cookies = cookies
    }),
    setHeaders: (headers) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.headers = headers
    }),
    setFormData: (items) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.formData = items
    }),
    setParamsFromUrl: (params) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) {
        t.request.params = params
      }
    }),
    setProxy: (proxy) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.proxy = proxy
    }),
    setFollowRedirects: (follow) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.followRedirects = follow
    }),
    setMaxRedirects: (max) => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (t) t.request.maxRedirects = max
    }),

    sendRequest: () => set((s) => {
      const t = s.tabs.find((t) => t.request.id === s.activeTabId)
      if (!t) return
      t.loading = true

      // Get TLS config from tls-store
      const tlsConfig = useTlsStore.getState().config

      // Deep clone request to escape Immer draft (Proxy object) before sending to Wails
      const requestSnapshot = JSON.parse(JSON.stringify(t.request)) as RequestConfig
      const originTabId = requestSnapshot.id

      // Call Wails bridge (or mock in browser mode)
      wailsSendRequest(requestSnapshot, tlsConfig)
        .then((response) => {
          set((s2) => {
            const t2 = s2.tabs.find((t) => t.request.id === originTabId)
            if (!t2) return
            t2.loading = false

            // Check if response contains error field (from backend)
            if (response && typeof response === 'object' && 'error' in response) {
              t2.response = {
                status: 0,
                statusText: 'Error',
                headers: {},
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                body: `Error: ${(response as any).error}`,
                size: 0,
                isBase64: false,
                timing: { dns: 0, tcp: 0, tls: 0, ttfb: 0, download: 0, total: 0 },
              }
            } else {
              t2.response = response

              // Add to history on successful response
              if (response && response.status > 0) {
                // Deep clone to avoid Immer frozen object sharing between stores
                const historyEntry = JSON.parse(JSON.stringify({
                  method: t2.request.method,
                  url: t2.request.url,
                  status: response.status,
                  statusText: response.statusText,
                  timing: response.timing.total,
                  params: t2.request.params,
                  headers: t2.request.headers,
                  body: t2.request.body,
                  response: response,
                  tlsConfig: useTlsStore.getState().config,
                  proxy: t2.request.proxy,
                  followRedirects: t2.request.followRedirects,
                  maxRedirects: t2.request.maxRedirects,
                }))
                useHistoryStore.getState().addEntry(historyEntry)
              }
            }
          })
        })
        .catch((error) => {
          set((s2) => {
            const t2 = s2.tabs.find((t) => t.request.id === originTabId)
            if (!t2) return
            t2.loading = false
            t2.response = {
              status: 0,
              statusText: 'Error',
              headers: {},
              body: `Request failed: ${error.message || error.toString() || 'Unknown error'}`,
              size: 0,
              isBase64: false,
              timing: { dns: 0, tcp: 0, tls: 0, ttfb: 0, download: 0, total: 0 },
            }
          })
        })
    }),
  }
  })
)
