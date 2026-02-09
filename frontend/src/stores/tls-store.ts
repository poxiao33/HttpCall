import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { TlsConfig, TlsTemplate } from '../types/tls'
import { saveTlsTemplates as wailsSaveTlsTemplates, loadTlsTemplates as wailsLoadTlsTemplates } from '../utils/wails-bridge'

interface TlsState {
  config: TlsConfig
  savedTemplates: TlsTemplate[]
  setPreset: (preset: string) => void
  setCustomJa3: (ja3: string) => void
  setCustomJa4: (ja4: string) => void
  setCustomAkamai: (akamai: string) => void
  saveTemplate: (name: string) => void
  deleteTemplate: (id: string) => void
  loadTemplate: (id: string) => void
  importTemplates: (templates: TlsTemplate[]) => void
  exportTemplates: () => TlsTemplate[]
  loadFromStorage: () => Promise<void>
}

export const useTlsStore = create<TlsState>()(
  immer((set, get) => ({
    config: {
      preset: 'chrome_131',
      customJa3: '',
      customJa4: '',
      customAkamai: '',
    },
    savedTemplates: [],

    setPreset: (preset) => set((s) => { s.config.preset = preset }),
    setCustomJa3: (ja3) => set((s) => { s.config.customJa3 = ja3 }),
    setCustomJa4: (ja4) => set((s) => { s.config.customJa4 = ja4 }),
    setCustomAkamai: (akamai) => set((s) => { s.config.customAkamai = akamai }),

    saveTemplate: (name) => {
      set((s) => {
        const newTemplate: TlsTemplate = {
          id: `template_${Date.now()}`,
          name,
          config: { ...s.config },
          createdAt: new Date().toISOString(),
        }
        s.savedTemplates.push(newTemplate)
      })
      wailsSaveTlsTemplates(get().savedTemplates).catch(() => {})
    },

    deleteTemplate: (id) => {
      set((s) => {
        const idx = s.savedTemplates.findIndex(t => t.id === id)
        if (idx >= 0) {
          s.savedTemplates.splice(idx, 1)
        }
      })
      wailsSaveTlsTemplates(get().savedTemplates).catch(() => {})
    },

    loadTemplate: (id) => set((s) => {
      const template = s.savedTemplates.find(t => t.id === id)
      if (template) {
        s.config = { ...template.config }
      }
    }),

    importTemplates: (templates) => set((s) => {
      s.savedTemplates = [...templates]
    }),

    exportTemplates: () => JSON.parse(JSON.stringify(get().savedTemplates)),

    loadFromStorage: async () => {
      try {
        const templates = await wailsLoadTlsTemplates()
        if (templates.length > 0) {
          set((s) => { s.savedTemplates = templates })
        }
      } catch (error) {
        console.error('Failed to load TLS templates:', error)
      }
    },
  }))
)
