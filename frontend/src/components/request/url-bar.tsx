import { useRequestStore } from '../../stores/request-store'
import type { HttpMethod } from '../../types/request'
import { Send, Loader2 } from 'lucide-react'
import { useState, useCallback, useEffect, useRef } from 'react'

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-method-get',
  POST: 'text-method-post',
  PUT: 'text-method-put',
  PATCH: 'text-method-patch',
  DELETE: 'text-method-delete',
  HEAD: 'text-method-head',
  OPTIONS: 'text-method-options',
}

export function UrlBar() {
  const store = useRequestStore()
  const [sendCount, setSendCount] = useState('1')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [methodOpen, setMethodOpen] = useState(false)
  const methodRef = useRef<HTMLDivElement>(null)

  const tab = store.tabs.find((t) => t.request.id === store.activeTabId)

  useEffect(() => {
    setUrlError(null)
  }, [store.activeTabId])

  useEffect(() => {
    if (!methodOpen) return
    const handleClick = (e: MouseEvent) => {
      if (methodRef.current && !methodRef.current.contains(e.target as Node)) {
        setMethodOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMethodOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [methodOpen])

  const validateUrl = useCallback((url: string): boolean => {
    if (!url.trim()) {
      setUrlError('URL 不能为空')
      return false
    }
    try {
      const urlObj = new URL(url)
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        setUrlError('URL 必须使用 http 或 https 协议')
        return false
      }
      setUrlError(null)
      return true
    } catch {
      setUrlError('URL 格式无效')
      return false
    }
  }, [])

  const handleSendRequest = useCallback(() => {
    if (!tab || !validateUrl(tab.request.url)) return
    const count = Math.max(1, Math.min(100, parseInt(sendCount, 10) || 1))
    if (count === 1) {
      store.sendRequest()
    } else {
      for (let i = 0; i < count; i++) {
        setTimeout(() => { store.sendRequest() }, i * 100)
      }
    }
  }, [tab, validateUrl, store, sendCount])

  if (!tab) return null
  const req = tab.request

  return (
    <div>
      <div className="flex items-center gap-0 h-10 bg-bg-secondary rounded-lg url-bar-container transition-all" role="group" aria-label="请求配置">
        <div className="relative" ref={methodRef}>
          <button
            onClick={() => setMethodOpen(!methodOpen)}
            className={`flex items-center gap-1 h-10 px-3 bg-transparent font-mono text-[12px] font-medium outline-none cursor-pointer rounded-l-lg hover:bg-bg-hover transition-colors ${METHOD_COLORS[req.method]}`}
            style={{ minWidth: 95 }}
            aria-label="选择 HTTP 方法"
            aria-expanded={methodOpen}
            aria-haspopup="listbox"
          >
            {req.method}
            <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor" className={`ml-1 text-text-tertiary transition-transform ${methodOpen ? 'rotate-180' : ''}`}><path d="M0 0l4 5 4-5z"/></svg>
          </button>
          {methodOpen && (
            <div className="absolute top-full left-0 mt-1 min-w-[120px] py-1 bg-bg-elevated rounded-lg shadow-2xl z-50" role="listbox">
              {METHODS.map((m) => (
                <button
                  key={m}
                  role="option"
                  aria-selected={req.method === m}
                  onClick={() => {
                    store.setMethod(m)
                    setMethodOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-1.5 font-mono text-[12px] font-medium rounded-md transition-colors ${
                    req.method === m
                      ? `${METHOD_COLORS[m]} bg-bg-hover`
                      : `${METHOD_COLORS[m]} hover:bg-bg-hover`
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="w-px h-5 bg-bg-elevated shrink-0" />
        <label htmlFor="request-url" className="sr-only">请求 URL</label>
        <input
          id="request-url"
          type="text"
          value={req.url}
          onChange={(e) => {
            const newUrl = e.target.value
            store.setUrl(newUrl)
            if (urlError) setUrlError(null)
            try {
              const url = new URL(newUrl)
              const params = Array.from(url.searchParams.entries()).map(([key, value]) => ({
                id: Math.random().toString(36).slice(2, 10),
                key,
                value,
                enabled: true,
              }))
              store.setParamsFromUrl(params)
            } catch {
              if (!newUrl.includes('?')) {
                store.setParamsFromUrl([])
              }
            }
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSendRequest() }}
          placeholder="输入请求 URL，例如 https://api.example.com/users"
          className={`flex-1 h-10 px-3 bg-transparent outline-none font-mono text-[13px] placeholder:text-text-tertiary ${
            urlError ? 'text-error' : 'text-text-primary'
          }`}
          aria-invalid={urlError ? 'true' : 'false'}
          aria-describedby={urlError ? 'url-error' : undefined}
        />
        <div className="send-count-area flex items-center shrink-0 h-10 px-1.5">
          <span className="text-[10px] text-text-tertiary select-none">×</span>
          <input
            type="text"
            inputMode="numeric"
            value={sendCount}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '')
              setSendCount(v === '' ? '' : v)
            }}
            onBlur={() => {
              const n = parseInt(sendCount, 10)
              setSendCount(isNaN(n) || n < 1 ? '1' : String(Math.min(n, 100)))
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendRequest() }}
            className="w-9 h-10 text-center bg-transparent text-[12px] font-mono text-text-secondary outline-none"
            aria-label="发送次数"
          />
        </div>
        <button
          onClick={handleSendRequest}
          disabled={tab.loading}
          className="btn-base btn-primary h-10 w-10 rounded-l-none rounded-r-lg disabled:opacity-35"
          aria-label={tab.loading ? '正在发送请求' : '发送请求'}
        >
          {tab.loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
        </button>
      </div>

      {urlError && (
        <div id="url-error" role="alert" className="mt-2 px-3 py-2 bg-error/8 rounded-lg text-[12px] text-error selectable-content">
          {urlError}
        </div>
      )}
    </div>
  )
}
