import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { saveCollections as wailsSaveCollections, loadCollections as wailsLoadCollections } from '../utils/wails-bridge'
import { uid } from '../utils/helpers'
import type { RequestConfig } from '../types/request'

export interface SavedRequest {
  id: string
  method: string
  url: string
  name: string
  config: RequestConfig
}

export interface Collection {
  id: string
  name: string
  requests: SavedRequest[]
  createdAt: string
}

interface CollectionState {
  collections: Collection[]
  selectedCollectionId: string | null

  createCollection: (name: string) => void
  deleteCollection: (id: string) => void
  renameCollection: (id: string, name: string) => void
  selectCollection: (id: string | null) => void

  addRequest: (collectionId: string, config: RequestConfig) => void
  removeRequest: (collectionId: string, requestId: string) => void
  renameRequest: (collectionId: string, requestId: string, name: string) => void

  importCollections: (collections: Collection[]) => void
  exportCollections: () => Collection[]

  loadFromStorage: () => Promise<void>
  persistToStorage: () => void
}

export const useCollectionStore = create<CollectionState>()(
  immer((set, get) => {
    const persist = () => {
      wailsSaveCollections(get().collections).catch((error) => {
        console.error('Failed to save collections:', error)
      })
    }

    return {
    collections: [],
    selectedCollectionId: null,

    createCollection: (name) => {
      set((s) => {
        s.collections.push({
          id: uid(),
          name,
          requests: [],
          createdAt: new Date().toISOString(),
        })
      })
      persist()
    },

    deleteCollection: (id) => {
      set((s) => {
        s.collections = s.collections.filter((c) => c.id !== id)
        if (s.selectedCollectionId === id) {
          s.selectedCollectionId = null
        }
      })
      persist()
    },

    renameCollection: (id, name) => {
      set((s) => {
        const c = s.collections.find((c) => c.id === id)
        if (c) c.name = name
      })
      persist()
    },

    selectCollection: (id) => set((s) => {
      s.selectedCollectionId = id
    }),

    addRequest: (collectionId, config) => {
      set((s) => {
        const collection = s.collections.find((c) => c.id === collectionId)
        if (!collection) return
        collection.requests.push({
          id: uid(),
          method: config.method,
          url: config.url,
          name: config.name,
          config: JSON.parse(JSON.stringify(config)),
        })
      })
      persist()
    },

    removeRequest: (collectionId, requestId) => {
      set((s) => {
        const collection = s.collections.find((c) => c.id === collectionId)
        if (collection) {
          collection.requests = collection.requests.filter((r) => r.id !== requestId)
        }
      })
      persist()
    },

    renameRequest: (collectionId, requestId, name) => {
      set((s) => {
        const collection = s.collections.find((c) => c.id === collectionId)
        if (!collection) return
        const req = collection.requests.find((r) => r.id === requestId)
        if (req) req.name = name
      })
      persist()
    },

    importCollections: (collections) => {
      set((s) => {
        s.collections = collections
        s.selectedCollectionId = null
      })
      persist()
    },

    exportCollections: () => {
      return JSON.parse(JSON.stringify(get().collections))
    },

    loadFromStorage: async () => {
      try {
        const collections = await wailsLoadCollections()
        if (collections.length > 0) {
          set((s) => { s.collections = collections })
        }
      } catch (error) {
        console.error('Failed to load collections:', error)
      }
    },

    persistToStorage: () => { persist() },
  }
  })
)
