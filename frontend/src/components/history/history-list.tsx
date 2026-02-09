import { useState, useCallback, useMemo } from 'react'
import { useHistoryStore } from '../../stores/history-store'
import { useCollectionStore } from '../../stores/collection-store'
import { useRequestStore } from '../../stores/request-store'
import { useUiStore } from '../../stores/ui-store'
import { MethodBadge, StatusBadge } from '../shared/badge'
import { Search, Trash2, MessageSquare, FolderPlus } from 'lucide-react'
import { uid } from '../../utils/helpers'
import type { RequestConfig, KeyValuePair } from '../../types/request'

function historyToRequestConfig(entry: ReturnType<typeof useHistoryStore.getState>['entries'][0]): RequestConfig {
  return {
    id: uid(),
    name: `${entry.method} ${entry.url}`,
    method: entry.method,
    url: entry.url,
    params: entry.params?.length ? entry.params : [],
    headers: entry.headers?.length ? entry.headers : [],
    cookies: [] as KeyValuePair[],
    body: entry.body || '',
    bodyType: entry.body ? 'raw' : 'none',
    formData: [],
    auth: { type: 'none' },
    followRedirects: entry.followRedirects ?? true,
    maxRedirects: entry.maxRedirects ?? 5,
    proxy: entry.proxy ?? { type: 'none', host: '', port: 8080 },
  }
}

export function HistoryList() {
  const { entries, searchQuery, setSearchQuery, deleteEntry, updateNote, clearAll } = useHistoryStore()
  const { collections, addRequest } = useCollectionStore()
  const { loadFromHistory } = useRequestStore()
  const { setActiveView } = useUiStore()
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [collectionPicker, setCollectionPicker] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!searchQuery) return entries
    const q = searchQuery.toLowerCase()
    return entries.filter((e) => {
      if (e.url.toLowerCase().includes(q)) return true
      if (e.method.toLowerCase().includes(q)) return true
      if ((e.note || '').toLowerCase().includes(q)) return true
      if (e.statusText?.toLowerCase().includes(q)) return true
      if (e.body?.toLowerCase().includes(q)) return true
      if (e.headers?.some((h) => h.key.toLowerCase().includes(q) || h.value.toLowerCase().includes(q))) return true
      if (e.response?.body?.toLowerCase().includes(q)) return true
      if (e.response?.headers) {
        const rh = e.response.headers
        if (Object.keys(rh).some((k) => k.toLowerCase().includes(q) || rh[k].toLowerCase().includes(q))) return true
      }
      return false
    })
  }, [entries, searchQuery])

  const handleRowClick = useCallback((entry: typeof entries[0]) => {
    loadFromHistory(entry)
    setActiveView('editor')
  }, [loadFromHistory, setActiveView])

  const handleNoteKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter') setEditingNote(null)
  }, [])

  const toggleEditNote = useCallback((id: string) => {
    setEditingNote(prev => prev === id ? null : id)
  }, [])

  const handleAddToCollection = useCallback((entryId: string, collectionId: string) => {
    const entry = entries.find((e) => e.id === entryId)
    if (!entry) return
    const config = historyToRequestConfig(entry)
    addRequest(collectionId, config)
    setCollectionPicker(null)
  }, [entries, addRequest])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 shrink-0 bg-bg-secondary">
        <div className="flex items-center gap-1.5 h-8 px-3 bg-bg-input rounded-md max-w-md">
          <Search size={14} className="text-text-tertiary shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索历史..."
            className="flex-1 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary"
          />
        </div>
      </div>

      {/* Table header */}
      <div className="flex items-center px-4 py-2 bg-bg-tertiary/30 text-[11px] text-text-tertiary uppercase tracking-wider font-medium shrink-0">
        <div className="w-16 shrink-0">方法</div>
        <div className="flex-1 min-w-0">URL</div>
        <div className="w-20 shrink-0 text-center">状态</div>
        <div className="w-20 shrink-0 text-right">耗时</div>
        <div className="w-40 shrink-0 pl-4">备注</div>
        <div className="w-20 shrink-0" />
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.map((entry, index) => (
          <div key={entry.id} className="group">
            <div
              className={`flex items-center px-4 py-2.5 hover:bg-bg-hover rounded-md cursor-pointer transition-colors ${
                index % 2 === 0 ? '' : 'bg-bg-secondary/30'
              }`}
              onClick={() => handleRowClick(entry)}
            >
              <div className="w-16 shrink-0">
                <MethodBadge method={entry.method} />
              </div>
              <div className="flex-1 min-w-0 font-mono text-[13px] text-text-primary selectable-content" title={entry.url}>
                <div className="truncate">{entry.url}</div>
              </div>
              <div className="w-20 shrink-0 text-center">
                <StatusBadge status={entry.status} />
              </div>
              <div className="w-20 shrink-0 text-right text-[11px] text-text-tertiary font-mono selectable-content">
                {entry.timing}ms
              </div>
              <div className="w-40 shrink-0 pl-4" onClick={(e) => e.stopPropagation()}>
                {editingNote === entry.id ? (
                  <input
                    type="text"
                    value={entry.note || ''}
                    onChange={(e) => updateNote(entry.id, e.target.value)}
                    placeholder="添加备注..."
                    className="w-full h-7 px-2 bg-bg-input rounded-md text-[12px] text-text-secondary outline-none"
                    autoFocus
                    onKeyDown={handleNoteKeyDown}
                  />
                ) : (
                  <span className="text-[12px] text-text-tertiary truncate block">{entry.note || '-'}</span>
                )}
              </div>
              <div className="w-20 shrink-0 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <button
                    onClick={() => setCollectionPicker(collectionPicker === entry.id ? null : entry.id)}
                    className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-bg-active transition-colors"
                    title="添加到集合"
                    aria-label="添加到集合"
                  >
                    <FolderPlus size={12} />
                  </button>
                  {collectionPicker === entry.id && (
                    <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-bg-elevated rounded-lg shadow-2xl py-1">
                      {collections.length === 0 ? (
                        <div className="px-3 py-2 text-[10px] text-text-tertiary">暂无集合</div>
                      ) : (
                        collections.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleAddToCollection(entry.id, c.id)}
                            className="w-full text-left px-3 py-1.5 text-[12px] text-text-secondary hover:bg-bg-hover rounded-md transition-colors truncate"
                          >
                            {c.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => toggleEditNote(entry.id)}
                  className={`p-1 rounded-md ${entry.note ? 'text-text-secondary' : 'text-text-tertiary'} hover:bg-bg-active transition-colors`}
                  aria-label="备注"
                >
                  <MessageSquare size={12} />
                </button>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="p-1 rounded-md text-text-tertiary hover:text-error hover:bg-bg-active transition-colors"
                  aria-label="删除"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-28 text-[13px] text-text-tertiary">
            {searchQuery ? '无匹配结果' : '暂无历史记录'}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-2 text-[10px] text-text-tertiary shrink-0 bg-bg-secondary">
        <span>{entries.length} 条记录</span>
        {entries.length > 0 && !confirmClear && (
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-text-tertiary hover:text-error hover:bg-bg-active transition-colors"
          >
            <Trash2 size={12} />
            <span>清空全部</span>
          </button>
        )}
        {confirmClear && (
          <div className="flex items-center gap-2">
            <span className="text-error">确定清空？</span>
            <button
              onClick={() => { clearAll(); setConfirmClear(false) }}
              className="px-2 py-0.5 rounded-md bg-error/10 text-error hover:bg-error/18 transition-colors"
            >
              确定
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="px-2 py-0.5 rounded-md text-text-tertiary hover:bg-bg-active transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  )
}