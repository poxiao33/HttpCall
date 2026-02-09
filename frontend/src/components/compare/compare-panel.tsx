import { useState, useCallback } from 'react'
import { ClipboardPaste, History, X, Plus } from 'lucide-react'
import { useCompareStore } from '../../stores/compare-store'
import { useHistoryStore } from '../../stores/history-store'
import type { CompareRequest } from '../../types/compare'
import { uid, getMethodColor, truncateUrl } from '../../utils/helpers'
import { parseMultipleRequests } from '../../utils/curl-parser'

export function ComparePanel() {
  const { requests, removeRequest, clearRequests, addRequest } = useCompareStore()
  const { entries } = useHistoryStore()
  const [showCurlInput, setShowCurlInput] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [curlText, setCurlText] = useState('')
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set())

  const handlePasteCurl = useCallback(() => {
    setShowCurlInput(true)
  }, [])

  const handleCurlSubmit = useCallback(() => {
    const parsed = parseMultipleRequests(curlText)
    parsed.forEach(req => addRequest(req))
    setShowCurlInput(false)
    setCurlText('')
  }, [curlText, addRequest])

  const handleImportHistory = useCallback(() => {
    setShowHistoryModal(true)
    setSelectedHistoryIds(new Set())
  }, [])

  const toggleHistorySelection = useCallback((id: string) => {
    setSelectedHistoryIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const handleImportSelected = useCallback(() => {
    selectedHistoryIds.forEach(id => {
      const entry = entries.find(e => e.id === id)
      if (entry) {
        const compareReq: CompareRequest = {
          id: uid(),
          method: entry.method,
          url: entry.url,
          params: entry.params.reduce((acc, p) => {
            if (p.enabled && p.key) {
              acc[p.key] = p.value
            }
            return acc
          }, {} as Record<string, string>),
          headers: entry.headers.reduce((acc, h) => {
            if (h.enabled && h.key) {
              acc[h.key] = h.value
            }
            return acc
          }, {} as Record<string, string>),
          cookies: {},
          body: entry.body,
          response: entry.response ? {
            status: entry.response.status,
            statusText: entry.response.statusText,
            headers: entry.response.headers,
            body: entry.response.body,
          } : undefined,
        }
        addRequest(compareReq)
      }
    })
    setShowHistoryModal(false)
    setSelectedHistoryIds(new Set())
  }, [selectedHistoryIds, entries, addRequest])

  return (
    <div className="flex flex-col h-full bg-bg-secondary relative">
      <div className="flex items-center gap-2 p-3 bg-bg-tertiary/20">
        <button
          onClick={handlePasteCurl}
          className="btn-base btn-secondary px-2.5 py-1.5 text-[12px]"
        >
          <ClipboardPaste size={12} />
          <span>导入请求</span>
        </button>
        <button
          onClick={handleImportHistory}
          className="btn-base btn-secondary px-2.5 py-1.5 text-[12px]"
        >
          <History size={12} />
          <span>从历史导入</span>
        </button>
        {requests.length > 0 && (
          <button
            onClick={clearRequests}
            className="btn-base btn-ghost ml-auto px-2.5 py-1.5 text-[12px]"
          >
            清空
          </button>
        )}
      </div>

      {showCurlInput && (
        <div className="absolute inset-0 bg-bg-base/90 backdrop-blur-sm z-10 flex flex-col p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-text-primary">导入请求</h3>
            <button
              onClick={() => setShowCurlInput(false)}
              className="p-1 hover:bg-bg-hover/30 rounded-md transition-colors"
              aria-label="关闭"
            >
              <X size={16} className="text-text-secondary" />
            </button>
          </div>
          <textarea
            value={curlText}
            onChange={(e) => setCurlText(e.target.value)}
            placeholder="粘贴 cURL 命令或原始 HTTP 请求，多个请求用空行分隔..."
            className="flex-1 p-3 bg-bg-input rounded-md text-[13px] font-mono text-text-primary resize-none outline-none placeholder:text-text-tertiary"
            autoFocus
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleCurlSubmit}
              className="btn-base btn-primary px-3 py-1.5 text-[12px]"
            >
              导入
            </button>
            <button
              onClick={() => setShowCurlInput(false)}
              className="btn-base btn-ghost px-3 py-1.5 text-[12px]"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <Plus size={28} className="mb-2 opacity-30" />
            <p className="text-[12px] text-text-secondary">暂无请求</p>
            <p className="text-[10px] mt-1">点击上方按钮添加请求</p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5 selectable-content">
            {requests.map((req, index) => (
              <div
                key={req.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors group ${
                  index % 2 === 0 ? 'bg-bg-primary/50' : ''
                } hover:bg-bg-hover/30`}
              >
                <span className="text-[10px] text-text-tertiary font-mono">
                  #{index + 1}
                </span>
                <span className={`font-mono text-[11px] font-semibold ${getMethodColor(req.method)}`}>
                  {req.method}
                </span>
                <span className="flex-1 text-[11px] text-text-secondary font-mono truncate">
                  {truncateUrl(req.url)}
                </span>
                {req.response && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success shrink-0">
                    {req.response.status}
                  </span>
                )}
                <button
                  onClick={() => removeRequest(req.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-bg-active rounded-md transition-all"
                  aria-label="移除请求"
                >
                  <X size={12} className="text-text-secondary" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showHistoryModal && (
        <div className="absolute inset-0 bg-bg-base/90 backdrop-blur-sm z-10 flex flex-col p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-text-primary">从历史导入</h3>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="p-1 hover:bg-bg-hover/30 rounded-md transition-colors"
              aria-label="关闭"
            >
              <X size={16} className="text-text-secondary" />
            </button>
          </div>

          <div className="flex-1 overflow-auto rounded-lg bg-bg-secondary">
            {entries.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[12px] text-text-secondary">
                暂无历史记录
              </div>
            ) : (
              <div className="p-2 space-y-0.5 selectable-content">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => toggleHistorySelection(entry.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                      selectedHistoryIds.has(entry.id)
                        ? 'bg-bg-active'
                        : 'hover:bg-bg-hover/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedHistoryIds.has(entry.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleHistorySelection(entry.id)
                      }}
                      className="w-3.5 h-3.5"
                    />
                    <span className={`font-mono text-[11px] font-semibold ${getMethodColor(entry.method)}`}>
                      {entry.method}
                    </span>
                    <span className="flex-1 text-[11px] text-text-secondary font-mono truncate">
                      {truncateUrl(entry.url)}
                    </span>
                    <span className="text-[10px] text-text-tertiary">
                      {entry.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleImportSelected}
              disabled={selectedHistoryIds.size === 0}
              className="btn-base btn-primary px-3 py-1.5 text-[12px] disabled:opacity-35 disabled:cursor-not-allowed"
            >
              导入 ({selectedHistoryIds.size})
            </button>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="btn-base btn-ghost px-3 py-1.5 text-[12px]"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
