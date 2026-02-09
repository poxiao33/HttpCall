import { useCallback, useEffect, useRef, useState } from 'react'
import { useRequestStore, type RequestState } from '../../stores/request-store'
import { useCollectionStore } from '../../stores/collection-store'
import { useHistoryStore } from '../../stores/history-store'
import { useTlsStore } from '../../stores/tls-store'
import { useUiStore } from '../../stores/ui-store'
import { UrlBar } from '../request/url-bar'
import { ParamsTab } from '../request/params-tab'
import { HeadersTab } from '../request/headers-tab'
import { BodyTab } from '../request/body-tab'
import { OptionsTab } from '../request/options-tab'
import { TlsTab } from '../tls/tls-tab'
import { CurlTab } from '../curl/curl-tab'
import { ResponsePanel } from '../response/response-panel'
import { ComparePanel } from '../compare/compare-panel'
import { CompareResult } from '../compare/compare-result'
import { CodecPanel } from '../codec/codec-panel'
import { HistoryList } from '../history/history-list'
import { Sidebar } from './sidebar'
import { StatusBar } from './status-bar'
import { Zap, Plus, X, FolderOpen, Folder, FileText, Trash2, Download, Upload, ChevronLeft, ChevronRight, Pencil, PanelLeft, Minus, Copy } from 'lucide-react'
import { ExportToFile } from '../../../wailsjs/go/main/App'
import { WindowMinimise, WindowToggleMaximise, Quit } from '../../../wailsjs/runtime/runtime'

const PANEL_TABS = [
  { id: 'params', label: '请求' },
  { id: 'headers', label: 'Headers' },
  { id: 'body', label: 'Body' },
  { id: 'options', label: '选项' },
  { id: 'tls', label: 'TLS 指纹' },
  { id: 'curl', label: 'cURL 导入' },
] as const

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-method-get',
  POST: 'text-method-post',
  PUT: 'text-method-put',
  PATCH: 'text-method-patch',
  DELETE: 'text-method-delete',
  HEAD: 'text-method-head',
  OPTIONS: 'text-method-options',
}

export function AppShell() {
  const store = useRequestStore()
  const { activeView, splitRatio, setSplitRatio, toggleSidebar, sidebarCollapsed } = useUiStore()
  const { loadFromStorage: loadHistory } = useHistoryStore()
  const { loadFromStorage: loadCollections } = useCollectionStore()
  const { loadFromStorage: loadTlsTemplates } = useTlsStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const splitRatioRef = useRef(splitRatio)
  const tabsRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const tabDragRef = useRef<{ tabId: string; startX: number; startScrollLeft: number; moved: boolean } | null>(null)

  const handleTabDragStart = useCallback((tabId: string, e: React.MouseEvent) => {
    if (e.button !== 0 || editingTabId) return
    const tabEl = (e.currentTarget as HTMLElement)
    const startX = e.clientX
    const startScrollLeft = tabsRef.current?.scrollLeft ?? 0
    tabDragRef.current = { tabId, startX, startScrollLeft, moved: false }

    const tabEls = Array.from(tabsRef.current?.querySelectorAll<HTMLElement>('[data-tab-id]') ?? [])
    const rects = tabEls.map(el => ({ id: el.dataset.tabId!, rect: el.getBoundingClientRect() }))
    let currentOrder = rects.map(r => r.id)

    tabEl.style.zIndex = '10'
    tabEl.style.transition = 'none'
    tabEls.forEach(el => { if (el.dataset.tabId !== tabId) el.style.transition = 'transform 200ms ease' })

    const onMove = (ev: MouseEvent) => {
      if (!tabDragRef.current) return
      const deltaX = ev.clientX - startX
      if (Math.abs(deltaX) > 3) tabDragRef.current.moved = true
      if (!tabDragRef.current.moved) return
      tabEl.style.transform = `translateX(${deltaX}px)`

      const dragRect = tabEl.getBoundingClientRect()
      const dragCenter = dragRect.left + dragRect.width / 2

      for (const other of tabEls) {
        if (other.dataset.tabId === tabId) continue
        const otherRect = other.getBoundingClientRect()
        const otherCenter = otherRect.left + otherRect.width / 2

        const dragIdx = currentOrder.indexOf(tabId)
        const otherIdx = currentOrder.indexOf(other.dataset.tabId!)

        if (dragIdx < otherIdx && dragCenter > otherCenter) {
          const shift = -tabEl.offsetWidth
          other.style.transform = `translateX(${shift}px)`
          currentOrder.splice(dragIdx, 1)
          currentOrder.splice(otherIdx, 0, tabId)
        } else if (dragIdx > otherIdx && dragCenter < otherCenter) {
          const shift = tabEl.offsetWidth
          other.style.transform = `translateX(${shift}px)`
          currentOrder.splice(dragIdx, 1)
          currentOrder.splice(otherIdx, 0, tabId)
        } else {
          const idx = currentOrder.indexOf(other.dataset.tabId!)
          const origIdx = rects.findIndex(r => r.id === other.dataset.tabId!)
          if (idx === origIdx) other.style.transform = ''
        }
      }
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      tabDragRef.current = null

      tabEls.forEach(el => { el.style.transform = ''; el.style.transition = ''; el.style.zIndex = '' })

      const origOrder = rects.map(r => r.id)
      if (currentOrder.join() !== origOrder.join()) {
        store.setTabOrder(currentOrder)
      }
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [editingTabId, store])

  useEffect(() => {
    loadHistory()
    loadCollections()
    loadTlsTemplates()
  }, [loadHistory, loadCollections, loadTlsTemplates])

  useEffect(() => {
    splitRatioRef.current = splitRatio
  }, [splitRatio])

  const updateScrollState = useCallback(() => {
    if (!tabsRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1)
  }, [])

  useEffect(() => {
    const container = tabsRef.current
    if (!container) return
    updateScrollState()
    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(container)
    container.addEventListener('scroll', updateScrollState)
    return () => {
      resizeObserver.disconnect()
      container.removeEventListener('scroll', updateScrollState)
    }
  }, [updateScrollState, store.tabs.length])

  useEffect(() => {
    if (!tabsRef.current) return
    const activeBtn = tabsRef.current.querySelector(`[data-tab-active="true"]`) as HTMLElement
    if (activeBtn) {
      activeBtn.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    }
  }, [store.activeTabId])

  const handleMouseDown = useCallback(() => {
    dragging.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !dragging.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pos = ((e.clientY - rect.top) / rect.height) * 100
      const clamped = Math.max(20, Math.min(80, pos))
      const top = containerRef.current.querySelector('[data-split-top]') as HTMLElement
      if (top) top.style.height = `${clamped}%`
      splitRatioRef.current = clamped / 100
    }
    const handleMouseUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setSplitRatio(splitRatioRef.current)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [setSplitRatio])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName?.toLowerCase()
      const isTyping = tagName === 'input' || tagName === 'textarea' || target?.isContentEditable
      if (event.key.toLowerCase() === 't') {
        event.preventDefault()
        store.addTab()
        return
      }
      if (event.key.toLowerCase() === 'w') {
        event.preventDefault()
        if (store.tabs.length > 1) {
          store.removeTab(store.activeTabId)
        }
        return
      }
      if (event.key.toLowerCase() === 'b' && !isTyping) {
        event.preventDefault()
        toggleSidebar()
        return
      }
      if (event.key === 'Enter' && !isTyping && activeView === 'editor') {
        event.preventDefault()
        const currentTab = store.currentTab()
        if (currentTab?.request.url.trim()) {
          store.sendRequest()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeView, store, toggleSidebar])

  const viewTitle = activeView === 'history'
    ? '历史记录'
    : activeView === 'compare'
      ? '请求对比分析'
      : activeView === 'codec'
        ? '编解码工具箱'
        : '集合管理'
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)

  return (
    <div className="relative flex flex-col h-screen bg-bg-base">
      <div
        className="drag-region absolute z-40"
        style={{ left: isMac ? 54 : 0, top: 0, width: sidebarCollapsed ? (isMac ? 42 : 56) : (isMac ? 156 : 140), height: isMac ? 40 : 32 }}
      />

      <button
        onClick={toggleSidebar}
        className="no-drag absolute z-50 w-8 h-8 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-bg-hover flex items-center justify-center transition-colors"
        style={{ left: isMac ? 96 : 6, top: 3 }}
        title={sidebarCollapsed ? '展开导航栏 (⌘/Ctrl+B)' : '收起导航栏 (⌘/Ctrl+B)'}
        aria-label={sidebarCollapsed ? '展开导航栏' : '收起导航栏'}
      >
        <PanelLeft size={14} strokeWidth={1.5} />
      </button>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />

        <div className="flex flex-col flex-1 min-w-0 bg-bg-primary">
          {/* Title bar */}
          <div className="drag-region relative z-[41] flex items-center h-10 bg-bg-secondary shrink-0 transition-[padding-left] duration-200" style={{ paddingLeft: sidebarCollapsed ? (isMac ? 82 : 56) : 8, paddingRight: isMac ? 8 : 0, paddingBottom: isMac ? 2 : 0 }}>
            <div className="flex items-center gap-2 shrink-0 mr-3">
              <Zap size={16} className="text-text-tertiary" />
              <span className="text-[16px] font-semibold text-text-primary tracking-tight">HttpCall</span>
            </div>

            {activeView === 'editor' ? (
              <>
                <div className="relative flex items-center h-full flex-1 min-w-0">
                  {(canScrollLeft || canScrollRight) && (
                    <button
                      onClick={() => tabsRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                      disabled={!canScrollLeft}
                      className={`no-drag absolute left-0 z-10 flex items-center justify-center w-7 h-full bg-bg-secondary transition-colors ${canScrollLeft ? 'text-text-secondary hover:text-text-primary cursor-pointer' : 'text-text-tertiary/30 cursor-default'}`}
                      title="向左滚动"
                      aria-label="向左滚动"
                    >
                      <ChevronLeft size={14} />
                    </button>
                  )}

                  <div ref={tabsRef} className="flex items-center h-full flex-1 min-w-0 overflow-x-auto scrollbar-none">
                    {store.tabs.map((tab) => {
                      const isActive = store.activeTabId === tab.request.id
                      return (
                      <button
                        key={tab.request.id}
                        onClick={() => { if (!tabDragRef.current?.moved) store.switchTab(tab.request.id) }}
                        onMouseDown={(e) => handleTabDragStart(tab.request.id, e)}
                        data-tab-active={isActive ? 'true' : undefined}
                        data-tab-id={tab.request.id}
                        className={`no-drag group relative flex items-center h-full min-w-[120px] max-w-[240px] px-0.5 shrink-0 ${
                          isActive
                            ? 'text-text-primary font-medium'
                            : 'text-text-tertiary hover:text-text-secondary'
                        }`}
                      >
                        <div className={`flex items-center gap-2 h-7 w-full px-2.5 rounded-md text-[12px] transition-colors ${
                          !isActive ? 'group-hover:bg-bg-hover' : ''
                        }`}>
                          <span className={`font-mono text-[11px] font-semibold shrink-0 ${METHOD_COLORS[tab.request.method] || 'text-text-secondary'}`}>
                            {tab.request.method}
                          </span>
                          {editingTabId === tab.request.id ? (
                            <input
                              type="text"
                              defaultValue={tab.request.name}
                              autoFocus
                              className="w-24 bg-transparent text-[12px] text-text-primary outline-none"
                              onClick={(e) => e.stopPropagation()}
                              onBlur={(e) => { store.renameTab(tab.request.id, e.target.value || tab.request.name); setEditingTabId(null) }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { store.renameTab(tab.request.id, (e.target as HTMLInputElement).value || tab.request.name); setEditingTabId(null) }
                                if (e.key === 'Escape') setEditingTabId(null)
                              }}
                            />
                          ) : (
                            <span
                              className="truncate"
                              title={tab.request.name}
                              onDoubleClick={(e) => { e.stopPropagation(); setEditingTabId(tab.request.id) }}
                            >
                              {tab.request.name}
                            </span>
                          )}

                          {store.tabs.length > 1 && (
                            <span
                              onClick={(e) => { e.stopPropagation(); store.removeTab(tab.request.id) }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-bg-active transition-all shrink-0 text-text-tertiary hover:text-text-secondary"
                            >
                              <X size={12} />
                            </span>
                          )}
                        </div>
                        {isActive && (
                          <div className="tab-indicator" />
                        )}
                      </button>
                      )
                    })}

                    <button
                      onClick={() => store.addTab()}
                      className="no-drag flex items-center justify-center h-full w-8 shrink-0"
                      title="新建请求"
                      aria-label="新建请求"
                    >
                      <div className="flex items-center justify-center w-7 h-7 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors">
                        <Plus size={14} />
                      </div>
                    </button>
                  </div>

                  {(canScrollLeft || canScrollRight) && (
                    <button
                      onClick={() => tabsRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                      disabled={!canScrollRight}
                      className={`no-drag absolute right-0 z-10 flex items-center justify-center w-7 h-full bg-bg-secondary transition-colors ${canScrollRight ? 'text-text-secondary hover:text-text-primary cursor-pointer' : 'text-text-tertiary/30 cursor-default'}`}
                      title="向右滚动"
                      aria-label="向右滚动"
                    >
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: isMac ? 2 : 0 }}>
                <span className="text-[14px] font-semibold text-text-primary">{viewTitle}</span>
              </div>
            )}

            {/* Windows window controls */}
            {!isMac && (
              <div className="no-drag flex items-center shrink-0 h-full ml-auto">
                <button
                  onClick={() => WindowMinimise()}
                  className="flex items-center justify-center w-11 h-full text-text-secondary hover:bg-bg-hover transition-colors"
                  aria-label="最小化"
                >
                  <Minus size={14} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => WindowToggleMaximise()}
                  className="flex items-center justify-center w-11 h-full text-text-secondary hover:bg-bg-hover transition-colors"
                  aria-label="最大化"
                >
                  <Copy size={12} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => Quit()}
                  className="flex items-center justify-center w-11 h-full text-text-secondary hover:bg-[#e81123] hover:text-white transition-colors"
                  aria-label="关闭"
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>

          {activeView === 'editor' && <EditorView store={store} containerRef={containerRef} handleMouseDown={handleMouseDown} splitRatio={splitRatio} />}
          {activeView === 'history' && <HistoryView />}
          {activeView === 'compare' && <CompareView />}
          {activeView === 'codec' && <CodecView />}
          {activeView === 'collections' && <CollectionsView />}
        </div>
      </div>

      <StatusBar />
    </div>
  )
}

function EditorView({ store, containerRef, handleMouseDown, splitRatio }: {
  store: RequestState
  containerRef: React.RefObject<HTMLDivElement | null>
  handleMouseDown: () => void
  splitRatio: number
}) {
  return (
    <>
      {/* Panel tabs */}
      <div className="flex items-center h-9 px-4 bg-bg-secondary shrink-0">
        {PANEL_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => store.setActivePanel(tab.id)}
            className={`relative px-3 h-9 text-[13px] transition-colors ${
              store.activePanel === tab.id
                ? 'text-text-primary font-semibold'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {tab.label}
            {store.activePanel === tab.id && (
              <div className="tab-indicator" />
            )}
          </button>
        ))}
      </div>

      {/* Split content */}
      <div ref={containerRef} className="flex flex-col flex-1 min-h-0">
        <div data-split-top style={{ height: `${Math.round(splitRatio * 100)}%` }} className="flex flex-col min-h-0">
          <div className="px-4 pt-3 pb-2 shrink-0">
            <UrlBar />
          </div>
          <div className="flex-1 min-h-0 overflow-auto px-4 pb-3">
            {store.activePanel === 'params' && <ParamsTab />}
            {store.activePanel === 'headers' && <HeadersTab />}
            {store.activePanel === 'body' && <BodyTab />}
            {store.activePanel === 'options' && <OptionsTab />}
            {store.activePanel === 'tls' && <TlsTab />}
            {store.activePanel === 'curl' && <CurlTab />}
          </div>
        </div>

        <div
          className="h-1.5 bg-bg-secondary hover:bg-bg-tertiary cursor-row-resize shrink-0 relative transition-colors"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-10 h-[1px] rounded-full bg-bg-elevated" />
          <div className="absolute inset-x-0 -top-1.5 -bottom-1.5" />
        </div>

        <div className="flex-1 min-h-0 bg-bg-base">
          <ResponsePanel />
        </div>
      </div>
    </>
  )
}

function HistoryView() {
  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <HistoryList />
    </div>
  )
}

function CompareView() {
  return (
    <div className="flex flex-1 min-h-0">
      <div className="w-[340px] shrink-0 overflow-hidden bg-bg-secondary">
        <ComparePanel />
      </div>
      <div className="flex-1 min-w-0 overflow-auto bg-bg-primary">
        <CompareResult />
      </div>
    </div>
  )
}

function CodecView() {
  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <CodecPanel />
    </div>
  )
}

function CollectionsView() {
  const {
    collections,
    selectedCollectionId,
    createCollection,
    deleteCollection,
    selectCollection,
    removeRequest,
    addRequest,
    renameRequest,
    importCollections,
    exportCollections,
  } = useCollectionStore()
  const requestStore = useRequestStore()
  const { setActiveView } = useUiStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [importError, setImportError] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addRequestName, setAddRequestName] = useState('')
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)

  const selectedCollection = collections.find((c) => c.id === selectedCollectionId)

  const handleCreate = () => {
    if (newCollectionName.trim()) {
      createCollection(newCollectionName.trim())
      setNewCollectionName('')
      setShowCreateDialog(false)
    }
  }

  const handleExport = async () => {
    const data = JSON.stringify(exportCollections(), null, 2)
    const filename = `collections-${new Date().toISOString().split('T')[0]}.json`
    try {
      await ExportToFile(data, filename)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleImport = () => {
    setImportError('')
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          try {
            const data = JSON.parse(ev.target?.result as string)
            if (!Array.isArray(data)) throw new Error('not array')
            importCollections(data)
          } catch {
            setImportError('导入失败：JSON 格式错误')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const handleAddCurrentRequest = () => {
    if (!selectedCollectionId) return
    const tab = requestStore.currentTab()
    if (!tab) return
    setAddRequestName(tab.request.name || `${tab.request.method} ${tab.request.url}`)
    setShowAddDialog(true)
  }

  const handleConfirmAdd = () => {
    if (!selectedCollectionId || !addRequestName.trim()) return
    const tab = requestStore.currentTab()
    if (!tab) return
    const config = JSON.parse(JSON.stringify(tab.request)) as import('../../types/request').RequestConfig
    config.name = addRequestName.trim()
    addRequest(selectedCollectionId, config)
    setShowAddDialog(false)
    setAddRequestName('')
  }

  const handleLoadRequest = (config: import('../../types/request').RequestConfig) => {
    requestStore.addTab(JSON.parse(JSON.stringify(config)))
    setActiveView('editor')
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* Left sidebar: Collections list */}
      <div className="w-[240px] shrink-0 flex flex-col bg-bg-secondary">
        <div className="flex items-center justify-between px-3 py-2.5 bg-bg-tertiary/40">
          <span className="text-[13px] font-semibold text-text-primary">集合</span>
          <div className="flex items-center gap-0.5">
            <button onClick={handleImport} className="p-1.5 hover:bg-bg-hover rounded-md transition-colors" title="导入" aria-label="导入">
              <Upload size={14} className="text-text-tertiary" />
            </button>
            <button onClick={handleExport} className="p-1.5 hover:bg-bg-hover rounded-md transition-colors" title="导出" aria-label="导出">
              <Download size={14} className="text-text-tertiary" />
            </button>
            <button onClick={() => setShowCreateDialog(true)} className="p-1.5 hover:bg-bg-hover rounded-md transition-colors" title="新建集合" aria-label="新建集合">
              <Plus size={14} className="text-text-tertiary" />
            </button>
          </div>
        </div>

        {importError && (
          <div className="px-3 py-2 text-micro text-error bg-error/8">
            {importError}
          </div>
        )}

        <div className="flex-1 overflow-auto p-2">
          {collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
              <FolderOpen size={28} className="mb-2 opacity-40" />
              <span className="text-[12px]">暂无集合</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              {collections.map((collection) => (
                <div key={collection.id}>
                  <div
                    className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                      selectedCollectionId === collection.id
                        ? 'bg-bg-active text-text-primary'
                        : 'hover:bg-bg-hover text-text-secondary'
                    }`}
                    onClick={() => selectCollection(collection.id)}
                  >
                    <Folder size={14} className="shrink-0 text-text-tertiary" />
                    <span className="flex-1 text-[12px] truncate">{collection.name}</span>
                    <span className="text-[10px] text-text-tertiary">{collection.requests.length}</span>
                    {confirmDeleteId !== collection.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(collection.id) }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-bg-active rounded-md transition-all"
                        aria-label="删除集合"
                      >
                        <Trash2 size={12} className="text-text-tertiary" />
                      </button>
                    )}
                  </div>
                  {confirmDeleteId === collection.id && (
                    <div className="flex items-center gap-1.5 px-2 py-1 ml-5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-micro text-error">删除？</span>
                      <button onClick={() => { deleteCollection(collection.id); setConfirmDeleteId(null) }} className="px-1.5 py-0.5 text-micro rounded-md bg-error/10 text-error hover:bg-error/18 transition-colors">确定</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="px-1.5 py-0.5 text-micro rounded-md text-text-tertiary hover:bg-bg-active transition-colors">取消</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Requests in selected collection */}
      <div className="flex-1 min-w-0 flex flex-col">
        {selectedCollection ? (
          <>
            <div className="flex items-center justify-between px-4 py-3 bg-bg-tertiary/30">
              <div>
                <h2 className="text-[14px] font-semibold text-text-primary">{selectedCollection.name}</h2>
                <p className="text-[11px] text-text-tertiary mt-0.5">{selectedCollection.requests.length} 个请求</p>
              </div>
              <button onClick={handleAddCurrentRequest} className="btn-base btn-secondary px-2.5 py-1.5 text-[12px]">
                <Plus size={12} />
                添加当前请求
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {selectedCollection.requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                  <FileText size={28} className="mb-2 opacity-40" />
                  <span className="text-[13px] text-text-secondary">暂无请求</span>
                  <p className="text-[11px] mt-1">点击「添加当前请求」将编辑器中的请求保存到此集合</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {selectedCollection.requests.map((req) => (
                    <div
                      key={req.id}
                      className="group flex items-center gap-3 px-3 py-2.5 rounded-md bg-bg-secondary hover:bg-bg-tertiary/60 cursor-pointer transition-colors"
                      onClick={() => editingRequestId !== req.id && handleLoadRequest(req.config)}
                    >
                      <span className={`font-mono text-[11px] font-medium shrink-0 w-12 ${METHOD_COLORS[req.method] || 'text-text-secondary'}`}>
                        {req.method}
                      </span>
                      <div className="flex-1 min-w-0">
                        {editingRequestId === req.id ? (
                          <input
                            type="text"
                            defaultValue={req.name}
                            autoFocus
                            className="w-full h-7 px-2 bg-bg-input rounded-md text-[12px] text-text-primary outline-none"
                            onClick={(e) => e.stopPropagation()}
                            onBlur={(e) => { renameRequest(selectedCollection.id, req.id, e.target.value || req.name); setEditingRequestId(null) }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { renameRequest(selectedCollection.id, req.id, (e.target as HTMLInputElement).value || req.name); setEditingRequestId(null) }
                              if (e.key === 'Escape') setEditingRequestId(null)
                            }}
                          />
                        ) : (
                          <div className="text-[12px] text-text-primary truncate">{req.name}</div>
                        )}
                        <div className="text-[11px] text-text-tertiary font-mono truncate selectable-content">{req.url}</div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setEditingRequestId(req.id)} className="p-1 hover:bg-bg-hover rounded-md transition-colors" title="重命名" aria-label="重命名">
                          <Pencil size={12} className="text-text-tertiary" />
                        </button>
                        <button onClick={() => removeRequest(selectedCollection.id, req.id)} className="p-1 hover:bg-bg-hover rounded-md transition-colors" aria-label="移除请求">
                          <X size={12} className="text-text-tertiary" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-text-tertiary">
            <Folder size={28} className="mb-3 opacity-30" />
            <span className="text-[13px] text-text-secondary">选择一个集合查看详情</span>
          </div>
        )}
      </div>

      {/* Create collection dialog */}
      {showCreateDialog && (
        <div className="absolute inset-0 bg-bg-base/90 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="w-full max-w-sm bg-bg-elevated rounded-lg p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-text-primary">新建集合</h3>
              <button onClick={() => setShowCreateDialog(false)} className="p-1 hover:bg-bg-hover rounded-md transition-colors" aria-label="关闭">
                <X size={16} className="text-text-tertiary" />
              </button>
            </div>
            <label className="block text-[11px] text-text-tertiary mb-1.5">集合名称</label>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="输入集合名称..."
              className="w-full h-8 px-3 bg-bg-input rounded-md text-[13px] text-text-primary outline-none placeholder:text-text-tertiary"
              autoFocus
            />
            <div className="flex items-center gap-2 mt-4">
              <button onClick={handleCreate} className="btn-base btn-primary flex-1 px-3 py-1.5 text-[12px]">创建</button>
              <button onClick={() => setShowCreateDialog(false)} className="btn-base btn-ghost flex-1 px-3 py-1.5 text-[12px]">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Add request dialog */}
      {showAddDialog && (
        <div className="absolute inset-0 bg-bg-base/90 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="w-full max-w-sm bg-bg-elevated rounded-lg p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-text-primary">添加请求到集合</h3>
              <button onClick={() => setShowAddDialog(false)} className="p-1 hover:bg-bg-hover rounded-md transition-colors" aria-label="关闭">
                <X size={16} className="text-text-tertiary" />
              </button>
            </div>
            <label className="block text-[11px] text-text-tertiary mb-1.5">请求名称</label>
            <input
              type="text"
              value={addRequestName}
              onChange={(e) => setAddRequestName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmAdd()}
              placeholder="输入请求名称..."
              className="w-full h-8 px-3 bg-bg-input rounded-md text-[13px] text-text-primary outline-none placeholder:text-text-tertiary"
              autoFocus
            />
            <div className="flex items-center gap-2 mt-4">
              <button onClick={handleConfirmAdd} className="btn-base btn-primary flex-1 px-3 py-1.5 text-[12px]">添加</button>
              <button onClick={() => setShowAddDialog(false)} className="btn-base btn-ghost flex-1 px-3 py-1.5 text-[12px]">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}