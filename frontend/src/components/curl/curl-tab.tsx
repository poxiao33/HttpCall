import { useState } from 'react'
import { useRequestStore } from '../../stores/request-store'
import { ClipboardPaste, ArrowRight, Copy, Check } from 'lucide-react'
import type { HttpMethod, KeyValuePair } from '../../types/request'
import { uid } from '../../utils/helpers'
import { parseRequestText } from '../../utils/curl-parser'
import { ClipboardGetText, ClipboardSetText } from '../../../wailsjs/runtime/runtime'

export function CurlTab() {
  const [curlInput, setCurlInput] = useState('')
  const [parsed, setParsed] = useState(false)
  const [error, setError] = useState('')
  const store = useRequestStore()

  const handleImport = () => {
    const result = parseRequestText(curlInput)
    if (!result) {
      setError('无法解析，支持 cURL 命令和原始 HTTP 请求格式')
      setParsed(false)
      return
    }

    store.setMethod(result.method as HttpMethod)
    store.setUrl(result.url)

    // Sync query params from URL
    try {
      const urlObj = new URL(result.url)
      const params: KeyValuePair[] = Array.from(urlObj.searchParams.entries()).map(([key, value]) => ({
        id: uid(), key, value, enabled: true,
      }))
      store.setParamsFromUrl(params)
    } catch {
      store.setParamsFromUrl([])
    }

    const headers: KeyValuePair[] = result.headers.map(h => ({
      id: uid(), key: h.key, value: h.value, enabled: true,
    }))
    if (headers.length > 0) {
      store.setHeaders(headers)
    }

    if (result.cookies.length > 0) {
      const cookieKvs: KeyValuePair[] = result.cookies.map(c => ({
        id: uid(), key: c.key, value: c.value, enabled: true,
      }))
      store.setCookies(cookieKvs)
    }

    if (result.body) {
      store.setBody(result.body)
      const ct = result.headers.find(h => h.key.toLowerCase() === 'content-type')?.value || ''
      if (ct.includes('json')) store.setBodyType('raw')
      else if (ct.includes('x-www-form-urlencoded')) store.setBodyType('form')
      else store.setBodyType('raw')
    } else {
      store.setBody('')
      store.setBodyType('none')
    }

    setError('')
    setParsed(true)
    setTimeout(() => setParsed(false), 2000)
  }

  const handlePaste = async () => {
    try {
      const text = await ClipboardGetText()
      setCurlInput(text)
    } catch {
      // clipboard access denied
    }
  }

  const exampleCurl = `curl 'https://api.example.com/users' \\\\
  -X POST \\\\
  -H 'Content-Type: application/json' \\\\
  -H 'Authorization: Bearer token123' \\\\
  --data-raw '{"name":"test","email":"test@example.com"}'`

  return (
    <div className="space-y-4">
      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-bg-tertiary/30">
          <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">粘贴 cURL 命令或原始 HTTP 请求</span>
          <button
            onClick={handlePaste}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-text-secondary hover:text-text-primary rounded-md hover:bg-bg-hover/30 transition-colors"
          >
            <ClipboardPaste size={12} />
            从剪贴板粘贴
          </button>
        </div>
        <textarea
          value={curlInput}
          onChange={(e) => { setCurlInput(e.target.value); setError(''); setParsed(false) }}
          placeholder={exampleCurl}
          className="w-full h-48 p-4 bg-bg-primary font-mono text-[13px] text-text-primary resize-none outline-none placeholder:text-text-tertiary leading-relaxed"
          spellCheck={false}
        />
        <div className="flex items-center justify-between px-4 py-2.5 bg-bg-tertiary/15">
          {error && <span className="text-[11px] text-error">{error}</span>}
          {parsed && (
            <span className="flex items-center gap-1 text-[11px] text-success">
              <Check size={12} />
              导入成功
            </span>
          )}
          {!error && !parsed && <span />}
          <button
            onClick={handleImport}
            disabled={!curlInput.trim()}
            className="btn-base btn-primary px-4 py-1.5 text-[12px] disabled:opacity-35"
          >
            <ArrowRight size={14} />
            导入请求
          </button>
        </div>
      </div>

      <ExportCurl />
    </div>
  )
}

function ExportCurl() {
  const store = useRequestStore()
  const tab = store.tabs.find((t) => t.request.id === store.activeTabId)
  const [copied, setCopied] = useState(false)

  if (!tab) return null
  const req = tab.request

  const generateCurl = (): string => {
    const parts = [`curl '${req.url || 'https://example.com'}'`]

    if (req.method !== 'GET') {
      parts.push(`  -X ${req.method}`)
    }

    req.headers
      .filter((h) => h.enabled && h.key)
      .forEach((h) => {
        parts.push(`  -H '${h.key}: ${h.value}'`)
      })

    if (req.body && req.bodyType !== 'none') {
      parts.push(`  --data-raw '${req.body}'`)
    }

    return parts.join(' \\\\\n')
  }

  const handleCopy = async () => {
    await ClipboardSetText(generateCurl())
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-bg-secondary rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-tertiary/30">
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">导出为 cURL</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-text-secondary hover:text-text-primary rounded-md hover:bg-bg-hover/30 transition-colors"
        >
          {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className="p-4 font-mono text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">
        {generateCurl()}
      </pre>
    </div>
  )
}