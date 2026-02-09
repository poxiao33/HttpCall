import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { HttpMethod, KeyValuePair, ProxyConfig, ResponseData } from '../types/request'
import type { TlsConfig } from '../types/tls'
import { saveHistory as wailsSaveHistory, loadHistory as wailsLoadHistory } from '../utils/wails-bridge'
import { uid } from '../utils/helpers'

export interface HistoryEntry {
  id: string
  method: HttpMethod
  url: string
  status: number
  statusText: string
  timing: number
  timestamp: number
  params: KeyValuePair[]
  headers: KeyValuePair[]
  body: string
  note?: string
  response?: ResponseData
  tlsConfig?: TlsConfig
  proxy?: ProxyConfig
  followRedirects?: boolean
  maxRedirects?: number
}

interface HistoryState {
  entries: HistoryEntry[]
  searchQuery: string
  selectedId: string | null
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void
  setSearchQuery: (query: string) => void
  setSelectedId: (id: string | null) => void
  updateNote: (id: string, note: string) => void
  deleteEntry: (id: string) => void
  clearAll: () => void
  loadFromStorage: () => Promise<void>
  persistToStorage: () => void
}

export const useHistoryStore = create<HistoryState>()(
  immer((set, get) => {
    // Helper to persist history after state changes
    const persistHistory = () => {
      const entries = get().entries
      wailsSaveHistory(entries).catch((error) => {
        console.error('Failed to save history:', error)
      })
    }

    return {
    entries: [],
    searchQuery: '',
    selectedId: null,

    addEntry: (entry) => {
      set((s) => {
        s.entries.unshift({ ...entry, id: uid(), timestamp: Date.now() })
      })
      persistHistory()
    },
    setSearchQuery: (query) => set((s) => { s.searchQuery = query }),
    setSelectedId: (id) => set((s) => { s.selectedId = id }),
    updateNote: (id, note) => {
      set((s) => {
        const entry = s.entries.find((e: HistoryEntry) => e.id === id)
        if (entry) entry.note = note
      })
      persistHistory()
    },
    deleteEntry: (id) => {
      set((s) => {
        s.entries = s.entries.filter((e: HistoryEntry) => e.id !== id)
      })
      persistHistory()
    },
    clearAll: () => {
      set((s) => { s.entries = [] })
      persistHistory()
    },

    loadFromStorage: async () => {
      try {
        const entries = await wailsLoadHistory()
        if (entries.length > 0) {
          set((s) => {
            s.entries = entries
          })
        }
      } catch (error) {
        console.error('Failed to load history:', error)
      }
    },

    persistToStorage: () => {
      persistHistory()
    },
  }
  })
)
