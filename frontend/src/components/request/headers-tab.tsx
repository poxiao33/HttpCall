import { useCallback } from 'react'
import { useRequestStore } from '../../stores/request-store'
import { KvEditor } from '../shared/kv-editor'
import { ClipboardPaste } from 'lucide-react'
import { uid } from '../../utils/helpers'
import type { KeyValuePair } from '../../types/request'
import { ClipboardGetText } from '../../../wailsjs/runtime/runtime'

const HTTP2_PSEUDO_HEADERS = new Set([':authority', ':method', ':path', ':scheme', ':status'])

function parseHeaders(input: string): KeyValuePair[] {
  const lines = input.split('\n').map(l => l.trimEnd()).filter(Boolean)
  if (lines.length === 0) return []

  const colonLines = lines.filter(l => l.includes(': ') || /^[^:]+:/.test(l))
  const isStandardFormat = colonLines.length > lines.length / 2

  if (isStandardFormat) {
    return lines
      .map(line => {
        const idx = line.indexOf(':')
        if (idx < 0) return null
        const key = line.slice(0, idx).trim()
        const value = line.slice(idx + 1).trim()
        if (!key || HTTP2_PSEUDO_HEADERS.has(key.toLowerCase())) return null
        return { id: uid(), key, value, enabled: true }
      })
      .filter((h): h is KeyValuePair => h !== null)
  }

  const headers: KeyValuePair[] = []
  for (let i = 0; i < lines.length - 1; i += 2) {
    const key = lines[i].trim()
    const value = lines[i + 1].trim()
    if (HTTP2_PSEUDO_HEADERS.has(key.toLowerCase())) continue
    if (!key) continue
    headers.push({ id: uid(), key, value, enabled: true })
  }
  return headers
}

export function HeadersTab() {
  const store = useRequestStore()
  const tab = store.tabs.find((t) => t.request.id === store.activeTabId)

  const handlePasteHeaders = useCallback(async () => {
    try {
      const text = await ClipboardGetText()
      if (!text.trim()) return
      const parsed = parseHeaders(text)
      if (parsed.length > 0) {
        store.setHeaders(parsed)
      }
    } catch {
      // Clipboard access failed
    }
  }, [store])

  if (!tab) return null
  const { request } = tab

  return (
    <div className="bg-bg-secondary rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-tertiary/30">
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">Request Headers</span>
        <button
          onClick={handlePasteHeaders}
          className="flex items-center gap-1 px-2 py-1 text-[11px] text-text-tertiary hover:text-text-secondary rounded-md hover:bg-bg-hover transition-colors"
        >
          <ClipboardPaste size={12} />
          粘贴请求头
        </button>
      </div>
      <KvEditor
        items={request.headers}
        onUpdate={store.updateHeader}
        onAdd={store.addHeader}
        onRemove={store.removeHeader}
        keyPlaceholder="Header Name"
        valuePlaceholder="Header Value"
      />
    </div>
  )
}
