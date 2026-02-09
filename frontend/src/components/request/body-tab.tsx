import { useRequestStore } from '../../stores/request-store'
import { KvEditor } from '../shared/kv-editor'
import { Wand2 } from 'lucide-react'
import { uid } from '../../utils/helpers'
import type { RequestConfig, FormDataPair } from '../../types/request'

const BODY_TYPES: { id: RequestConfig['bodyType']; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'form', label: 'Form Data' },
  { id: 'raw', label: 'Raw' },
]

function parseRawToFormData(raw: string): FormDataPair[] {
  if (!raw.trim()) return []
  const pairs = raw.split('&')
  if (pairs.length > 0 && pairs.every(p => p.includes('='))) {
    return pairs.map(p => {
      const eqIdx = p.indexOf('=')
      const key = decodeURIComponent(p.slice(0, eqIdx))
      const value = decodeURIComponent(p.slice(eqIdx + 1))
      return { id: uid(), key, value, enabled: true, type: 'text' as const }
    })
  }
  try {
    const obj = JSON.parse(raw)
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return Object.entries(obj).map(([key, value]) => ({
        id: uid(),
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        enabled: true,
        type: 'text' as const,
      }))
    }
  } catch {
    // not JSON
  }
  return []
}

function formDataToRaw(items: FormDataPair[]): string {
  const enabled = items.filter(i => i.enabled && i.key)
  if (enabled.length === 0) return ''
  return enabled
    .map(i => `${encodeURIComponent(i.key)}=${encodeURIComponent(i.value)}`)
    .join('&')
}

export function BodyTab() {
  const store = useRequestStore()
  const tab = store.tabs.find((t) => t.request.id === store.activeTabId)
  if (!tab) return null
  const req = tab.request

  const handleFormDataUpdate = (id: string, field: 'key' | 'value' | 'enabled' | 'note', val: string | boolean) => {
    if (field === 'key' || field === 'value' || field === 'note') {
      store.updateFormData(id, { [field]: val })
    } else if (field === 'enabled') {
      store.updateFormData(id, { enabled: val as boolean })
    }
  }

  const handleSwitchType = (newType: RequestConfig['bodyType']) => {
    const oldType = req.bodyType
    if (oldType === newType) return
    if (oldType === 'raw' && newType === 'form') {
      const parsed = parseRawToFormData(req.body)
      if (parsed.length > 0) store.setFormData(parsed)
    }
    if (oldType === 'form' && newType === 'raw') {
      const raw = formDataToRaw(req.formData)
      if (raw) store.setBody(raw)
    }
    store.setBodyType(newType)
  }

  const handleBeautifyJson = () => {
    try {
      const parsed = JSON.parse(req.body)
      store.setBody(JSON.stringify(parsed, null, 2))
    } catch {
      // not valid JSON
    }
  }

  const isValidJson = (() => {
    if (!req.body.trim()) return false
    try { JSON.parse(req.body); return true } catch { return false }
  })()

  return (
    <div className="bg-bg-secondary rounded-lg overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-2.5 bg-bg-tertiary/30">
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mr-1">Content Type</span>
        {BODY_TYPES.map((t) => (
          <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="bodyType"
              checked={req.bodyType === t.id}
              onChange={() => handleSwitchType(t.id)}
              className="w-3.5 h-3.5 accent-accent"
            />
            <span className={`text-[12px] ${req.bodyType === t.id ? 'text-text-primary font-medium' : 'text-text-tertiary'}`}>
              {t.label}
            </span>
          </label>
        ))}
      </div>

      {req.bodyType === 'none' && (
        <div className="flex items-center justify-center h-28 text-[13px] text-text-tertiary">
          该请求没有 Body
        </div>
      )}

      {req.bodyType === 'raw' && (
        <div className="relative">
          {req.body.trim() && isValidJson && (
            <div className="absolute top-2 right-3 z-10">
              <button
                onClick={handleBeautifyJson}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-text-tertiary hover:text-text-secondary rounded-md hover:bg-bg-hover transition-colors"
                title="美化 JSON"
              >
                <Wand2 size={12} />
                美化
              </button>
            </div>
          )}
          <textarea
            value={req.body}
            onChange={(e) => store.setBody(e.target.value)}
            placeholder={'请求体内容...'}
            className="w-full h-56 p-4 bg-bg-primary font-mono text-[13px] text-text-primary resize-none outline-none placeholder:text-text-tertiary leading-relaxed"
            spellCheck={false}
          />
        </div>
      )}

      {req.bodyType === 'form' && (
        <KvEditor
          items={req.formData}
          onUpdate={handleFormDataUpdate}
          onAdd={store.addFormData}
          onRemove={store.removeFormData}
          keyPlaceholder="Key"
          valuePlaceholder="Value"
        />
      )}
    </div>
  )
}