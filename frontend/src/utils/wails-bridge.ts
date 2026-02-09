/**
 * Wails Bridge - Frontend-Backend Communication Layer
 *
 * This module provides a bridge between the React frontend and the Go backend
 * in the Wails desktop application. It handles:
 * - HTTP request execution with custom TLS fingerprints
 * - Persistent storage of templates, collections, and history
 * - Graceful fallback to mock data in browser dev mode
 *
 * @module wails-bridge
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: 'any' types are necessary for Wails runtime which is dynamically injected

import type { RequestConfig, ResponseData } from '../types/request'
import type { TlsConfig, TlsTemplate } from '../types/tls'
import type { Collection } from '../stores/collection-store'
import type { HistoryEntry } from '../stores/history-store'

/**
 * Detects if the app is running in Wails desktop environment
 * Returns true if window.go.main.App is available
 */
const isWails = typeof window !== 'undefined' && (window as any).go?.main?.App

/**
 * Generates a mock HTTP response for browser development mode
 * Used when the Go backend is not available
 *
 * @returns Mock ResponseData with sample timing and TLS info
 */
function mockResponse(): ResponseData {
  return {
    status: 200,
    statusText: 'OK',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'server': 'nginx/1.24.0',
      'x-request-id': 'a1b2c3d4-e5f6-7890',
      'cache-control': 'no-cache',
      'date': new Date().toUTCString(),
    },
    body: JSON.stringify({
      message: "Mock response - 后端未连接",
      timestamp: Date.now(),
      data: { id: 1, name: "example", status: "active" }
    }, null, 2),
    size: 256,
    isBase64: false,
    timing: { dns: 12, tcp: 23, tls: 45, ttfb: 89, download: 15, total: 184 },
    tlsInfo: {
      version: 'TLS 1.3',
      cipherSuite: 'TLS_AES_128_GCM_SHA256',
      alpn: 'h2',
      ja3Hash: 'cd08e31494f9531f560d64c695473da9',
    },
    redirects: [],
  }
}

/**
 * Sends an HTTP request with custom TLS fingerprint configuration
 *
 * In Wails mode: Calls Go backend to execute real HTTP request with utls
 * In browser mode: Returns mock response after simulated delay
 *
 * @param request - HTTP request configuration (method, URL, headers, body, etc.)
 * @param tlsConfig - TLS fingerprint configuration (preset or custom)
 * @returns Promise resolving to response data with timing and TLS info
 * @throws Error if Wails backend call fails
 *
 * @example
 * ```typescript
 * const response = await sendRequest(
 *   { method: 'GET', url: 'https://api.example.com', headers: [] },
 *   { preset: 'chrome_131', customJa3: '', customJa4: '', customAkamai: '' }
 * )
 * console.log(response.status, response.timing.total)
 * ```
 */
export async function sendRequest(request: RequestConfig, tlsConfig: TlsConfig): Promise<ResponseData> {
  if (isWails) {
    try {
      const reqJSON = JSON.stringify(request)
      const tlsJSON = JSON.stringify(tlsConfig)
      const responseJSON = await (window as any).go.main.App.SendRequest(reqJSON, tlsJSON)
      return JSON.parse(responseJSON) as ResponseData
    } catch (error) {
      console.error('Wails sendRequest failed:', error)
      throw error
    }
  }

  // Browser dev mode: return mock response after delay
  await new Promise(resolve => setTimeout(resolve, 600))
  return mockResponse()
}

/**
 * Persists TLS templates to local storage via Go backend
 *
 * @param templates - Array of TLS templates to save
 * @throws Error if Wails backend call fails
 */
export async function saveTlsTemplates(templates: TlsTemplate[]): Promise<void> {
  if (isWails) {
    try {
      const templatesJSON = JSON.stringify(templates)
      await (window as any).go.main.App.SaveTlsTemplates(templatesJSON)
    } catch (error) {
      console.error('Wails saveTlsTemplates failed:', error)
      throw error
    }
  }
  // Browser dev mode: no-op (use localStorage or mock)
}

/**
 * Loads TLS templates from local storage via Go backend
 *
 * @returns Promise resolving to array of saved TLS templates (empty if none or error)
 */
export async function loadTlsTemplates(): Promise<TlsTemplate[]> {
  if (isWails) {
    try {
      const templatesJSON = await (window as any).go.main.App.LoadTlsTemplates()
      return JSON.parse(templatesJSON) as TlsTemplate[]
    } catch (error) {
      console.error('Wails loadTlsTemplates failed:', error)
      return []
    }
  }
  // Browser dev mode: return empty array
  return []
}

/**
 * Persists request collections to local storage via Go backend
 *
 * @param collections - Array of request collections to save
 * @throws Error if Wails backend call fails
 */
export async function saveCollections(collections: Collection[]): Promise<void> {
  if (isWails) {
    try {
      const collectionsJSON = JSON.stringify(collections)
      await (window as any).go.main.App.SaveCollection(collectionsJSON)
    } catch (error) {
      console.error('Wails saveCollections failed:', error)
      throw error
    }
  }
  // Browser dev mode: no-op
}

/**
 * Loads request collections from local storage via Go backend
 *
 * @returns Promise resolving to array of saved collections (empty if none or error)
 */
export async function loadCollections(): Promise<Collection[]> {
  if (isWails) {
    try {
      const collectionsJSON = await (window as any).go.main.App.LoadCollections()
      return JSON.parse(collectionsJSON) as Collection[]
    } catch (error) {
      console.error('Wails loadCollections failed:', error)
      return []
    }
  }
  // Browser dev mode: return empty array
  return []
}

/**
 * Persists request history to local storage via Go backend
 *
 * @param entries - Array of history entries to save
 * @throws Error if Wails backend call fails
 */
export async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  if (isWails) {
    try {
      const historyJSON = JSON.stringify(entries)
      await (window as any).go.main.App.SaveHistory(historyJSON)
    } catch (error) {
      console.error('Wails saveHistory failed:', error)
      throw error
    }
  }
  // Browser dev mode: no-op
}

/**
 * Loads request history from local storage via Go backend
 *
 * @returns Promise resolving to array of history entries (empty if none or error)
 */
export async function loadHistory(): Promise<HistoryEntry[]> {
  if (isWails) {
    try {
      const historyJSON = await (window as any).go.main.App.LoadHistory()
      return JSON.parse(historyJSON) as HistoryEntry[]
    } catch (error) {
      console.error('Wails loadHistory failed:', error)
      return []
    }
  }
  // Browser dev mode: return empty array
  return []
}
