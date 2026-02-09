import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type ActiveView = 'editor' | 'history' | 'compare' | 'codec' | 'collections'
export type Theme = 'light' | 'dark'

const UI_STORE_KEY = 'tls-probe-ui-state'

export const MIN_SPLIT_RATIO = 0.2
export const MAX_SPLIT_RATIO = 0.8
export const DEFAULT_SPLIT_RATIO = 0.55

interface PersistedUiState {
  activeView: ActiveView
  splitRatio: number
  sidebarCollapsed: boolean
  theme: Theme
}

function isActiveView(value: string): value is ActiveView {
  return value === 'editor' || value === 'history' || value === 'compare' || value === 'codec' || value === 'collections'
}

function clampSplitRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return DEFAULT_SPLIT_RATIO
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, ratio))
}

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light'
  }
  return 'dark'
}

function loadInitialState(): PersistedUiState {
  if (typeof window === 'undefined') {
    return { activeView: 'editor', splitRatio: DEFAULT_SPLIT_RATIO, sidebarCollapsed: false, theme: 'dark' }
  }

  try {
    const raw = window.localStorage.getItem(UI_STORE_KEY)
    if (!raw) {
      return { activeView: 'editor', splitRatio: DEFAULT_SPLIT_RATIO, sidebarCollapsed: false, theme: getSystemTheme() }
    }

    const parsed = JSON.parse(raw) as Partial<PersistedUiState>
    const activeView = parsed.activeView && isActiveView(parsed.activeView) ? parsed.activeView : 'editor'
    const splitRatio = clampSplitRatio(parsed.splitRatio ?? DEFAULT_SPLIT_RATIO)
    const sidebarCollapsed = Boolean(parsed.sidebarCollapsed)
    const theme: Theme = parsed.theme === 'light' ? 'light' : parsed.theme === 'dark' ? 'dark' : getSystemTheme()
    return { activeView, splitRatio, sidebarCollapsed, theme }
  } catch {
    return { activeView: 'editor', splitRatio: DEFAULT_SPLIT_RATIO, sidebarCollapsed: false, theme: getSystemTheme() }
  }
}

function persistState(state: PersistedUiState): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(UI_STORE_KEY, JSON.stringify(state))
  } catch {
    // Ignore persistence failures (private mode, quota exceeded, etc.)
  }
}

interface UiState {
  activeView: ActiveView
  splitRatio: number
  sidebarCollapsed: boolean
  theme: Theme
  setActiveView: (view: ActiveView) => void
  setSplitRatio: (r: number) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const initialState = loadInitialState()

export const useUiStore = create<UiState>()(
  immer((set) => ({
    activeView: initialState.activeView,
    splitRatio: initialState.splitRatio,
    sidebarCollapsed: initialState.sidebarCollapsed,
    theme: initialState.theme,

    setActiveView: (view) => set((s) => {
      s.activeView = view
      persistState({ activeView: s.activeView, splitRatio: s.splitRatio, sidebarCollapsed: s.sidebarCollapsed, theme: s.theme })
    }),
    setSplitRatio: (r) => set((s) => {
      s.splitRatio = clampSplitRatio(r)
      persistState({ activeView: s.activeView, splitRatio: s.splitRatio, sidebarCollapsed: s.sidebarCollapsed, theme: s.theme })
    }),
    setSidebarCollapsed: (collapsed) => set((s) => {
      s.sidebarCollapsed = collapsed
      persistState({ activeView: s.activeView, splitRatio: s.splitRatio, sidebarCollapsed: s.sidebarCollapsed, theme: s.theme })
    }),
    toggleSidebar: () => set((s) => {
      s.sidebarCollapsed = !s.sidebarCollapsed
      persistState({ activeView: s.activeView, splitRatio: s.splitRatio, sidebarCollapsed: s.sidebarCollapsed, theme: s.theme })
    }),
    setTheme: (theme) => set((s) => {
      s.theme = theme
      applyTheme(theme)
      persistState({ activeView: s.activeView, splitRatio: s.splitRatio, sidebarCollapsed: s.sidebarCollapsed, theme: s.theme })
    }),
    toggleTheme: () => set((s) => {
      s.theme = s.theme === 'dark' ? 'light' : 'dark'
      applyTheme(s.theme)
      persistState({ activeView: s.activeView, splitRatio: s.splitRatio, sidebarCollapsed: s.sidebarCollapsed, theme: s.theme })
    }),
  }))
)

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  if (theme === 'light') {
    html.classList.add('light')
    html.classList.remove('dark')
  } else {
    html.classList.add('dark')
    html.classList.remove('light')
  }
}

// Apply initial theme on load
applyTheme(initialState.theme)

// Listen for system theme changes
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const newTheme: Theme = e.matches ? 'dark' : 'light'
    useUiStore.getState().setTheme(newTheme)
  })
}
