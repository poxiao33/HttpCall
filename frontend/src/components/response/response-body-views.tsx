import { useState, useMemo } from 'react'
import { Copy, Check, Search, X, ZoomIn, ZoomOut, Maximize, FileWarning } from 'lucide-react'
import { ClipboardSetText } from '../../../wailsjs/runtime/runtime'

type BodyView = 'pretty' | 'raw' | 'hex' | 'img'

interface RespBodyProps {
  body: string
  headers: Record<string, string>
  isBase64?: boolean
  contentEncoding?: string
}

export function RespBody({ body, headers, isBase64 = false, contentEncoding }: RespBodyProps) {
  const contentType = headers['content-type'] ?? headers['Content-Type'] ?? ''
  const isImage = contentType.startsWith('image/')
  const [view, setView] = useState<BodyView>(isImage ? 'img' : isBase64 ? 'hex' : 'raw')
  const [copied, setCopied] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [jsonPath, setJsonPath] = useState('')

  const handleCopy = async () => {
    await ClipboardSetText(isBase64 ? `[Base64: ${body.length} chars]` : body)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const isJson = useMemo(() => {
    if (isBase64) return false
    try { JSON.parse(body); return true } catch { return false }
  }, [body, isBase64])

  const viewModes: { id: BodyView; label: string }[] = [
    { id: 'raw', label: '原始' },
    { id: 'pretty', label: '美化' },
    { id: 'hex', label: 'Hex' },
    { id: 'img', label: '图片' },
  ]

  const decompressedLabel = contentEncoding && contentEncoding !== 'identity'
    ? `已解压 ${contentEncoding}`
    : null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 shrink-0 bg-bg-secondary">
        <div className="flex items-center gap-0.5">
          {viewModes.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-2.5 py-1 text-[12px] rounded-md transition-colors ${
                view === v.id ? 'bg-bg-active text-text-primary font-medium' : 'text-text-tertiary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              {v.label}
            </button>
          ))}
          {decompressedLabel && (
            <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-success/12 text-success">
              {decompressedLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {searchOpen ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索..."
                className="w-40 h-7 px-2 bg-bg-input rounded-md text-[12px] text-text-primary outline-none"
                autoFocus
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery('') }} className="p-1 text-text-tertiary hover:text-text-primary rounded-md hover:bg-bg-hover transition-colors" aria-label="关闭搜索">
                <X size={12} />
              </button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="p-1 text-text-tertiary hover:text-text-primary rounded-md hover:bg-bg-hover transition-colors" aria-label="搜索">
              <Search size={12} />
            </button>
          )}
          <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 text-[12px] text-text-tertiary hover:text-text-primary rounded-md hover:bg-bg-hover transition-colors" aria-label="复制">
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {isJson && view === 'pretty' && detectContentKind(contentType) === 'json' && (
        <div className="px-4 py-2 shrink-0 bg-bg-secondary">
          <input
            type="text"
            value={jsonPath}
            onChange={(e) => setJsonPath(e.target.value)}
            placeholder="$.data.list[0].name"
            className="w-72 h-7 px-2 bg-bg-input rounded-md font-mono text-[12px] text-text-primary outline-none placeholder:text-text-tertiary"
          />
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {view === 'pretty' && (isBase64
          ? <BinaryPlaceholder size={body.length} />
          : <PrettyView body={body} search={searchQuery} contentType={contentType} />
        )}
        {view === 'raw' && (isBase64
          ? <BinaryPlaceholder size={body.length} />
          : <RawView body={body} search={searchQuery} />
        )}
        {view === 'hex' && <HexView body={body} isBase64={isBase64} />}
        {view === 'img' && <ImageView body={body} contentType={contentType} isBase64={isBase64} />}
      </div>
    </div>
  )
}

function BinaryPlaceholder({ size }: { size: number }) {
  const sizeStr = size > 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MB`
    : size > 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${size} B`

  return (
    <div className="flex flex-col items-center justify-center h-full text-text-tertiary gap-2">
      <FileWarning size={28} className="opacity-50" />
      <p className="text-[13px] text-text-tertiary">二进制内容，无法以文本显示</p>
      <p className="text-[10px]">大小: {sizeStr} (base64)</p>
      <p className="text-[10px]">请使用 Hex 或图片视图查看</p>
    </div>
  )
}

function PrettyView({ body, search, contentType }: { body: string; search: string; contentType: string }) {
  const formatted = formatBody(body, contentType)

  return (
    <pre className="px-5 py-4 font-mono text-[13px] text-text-primary whitespace-pre-wrap leading-relaxed">
      {search ? highlightText(formatted, search) : formatted}
    </pre>
  )
}

function detectContentKind(contentType: string): 'json' | 'html' | 'xml' | 'js' | 'css' | 'unknown' {
  const ct = contentType.toLowerCase()
  if (ct.includes('json')) return 'json'
  if (ct.includes('html')) return 'html'
  if (ct.includes('xml') || ct.includes('svg')) return 'xml'
  if (ct.includes('javascript') || ct.includes('ecmascript')) return 'js'
  if (ct.includes('css')) return 'css'
  return 'unknown'
}

function formatBody(body: string, contentType: string): string {
  const kind = detectContentKind(contentType)

  switch (kind) {
    case 'json':
      try { return JSON.stringify(JSON.parse(body), null, 2) } catch { return body }
    case 'html':
    case 'xml':
      return formatMarkup(body)
    case 'js':
    case 'css':
      return formatBraceLanguage(body)
    default: {
      try { return JSON.stringify(JSON.parse(body), null, 2) } catch { /* not JSON */ }
      const trimmed = body.trimStart()
      if (trimmed.startsWith('<')) return formatMarkup(body)
      if (trimmed.includes('{') && trimmed.includes('}')) return formatBraceLanguage(body)
      return body
    }
  }
}

function formatMarkup(src: string): string {
  let result = ''
  let indent = 0
  const tab = '  '
  const normalized = src.replace(/>\s+</g, '><').trim()
  const tokens = normalized.split(/(<[^>]+>)/g).filter(Boolean)

  for (const token of tokens) {
    if (token.startsWith('</')) {
      indent = Math.max(0, indent - 1)
      result += tab.repeat(indent) + token + '\n'
    } else if (token.startsWith('<') && !token.startsWith('<!') && !token.endsWith('/>') && !isVoidElement(token)) {
      result += tab.repeat(indent) + token + '\n'
      indent++
    } else if (token.startsWith('<')) {
      result += tab.repeat(indent) + token + '\n'
    } else {
      const text = token.trim()
      if (text) {
        result += tab.repeat(indent) + text + '\n'
      }
    }
  }
  return result.trimEnd()
}

function isVoidElement(tag: string): boolean {
  const voids = ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']
  const match = tag.match(/^<(\w+)/)
  return match ? voids.includes(match[1].toLowerCase()) : false
}

function formatBraceLanguage(src: string): string {
  let result = ''
  let indent = 0
  const tab = '  '
  let inString: string | null = null
  let escaped = false
  let lineStart = true

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (escaped) { result += ch; escaped = false; continue }
    if (ch === '\\' && inString) { result += ch; escaped = true; continue }
    if (inString) { result += ch; if (ch === inString) inString = null; continue }
    if (ch === '"' || ch === "'" || ch === '`') {
      if (lineStart) { result += tab.repeat(indent); lineStart = false }
      result += ch; inString = ch; continue
    }
    if (ch === '{' || ch === '[') {
      if (lineStart) { result += tab.repeat(indent); lineStart = false }
      result += ch + '\n'; indent++; lineStart = true; continue
    }
    if (ch === '}' || ch === ']') {
      indent = Math.max(0, indent - 1)
      if (!lineStart) result += '\n'
      result += tab.repeat(indent) + ch; lineStart = false
      const next = src[i + 1]
      if (next === ',' || next === ';') { result += next; i++ }
      result += '\n'; lineStart = true; continue
    }
    if (ch === ';') {
      if (lineStart) { result += tab.repeat(indent); lineStart = false }
      result += ';\n'; lineStart = true; continue
    }
    if (ch === '\n' || ch === '\r') {
      if (!lineStart) { result += '\n'; lineStart = true }; continue
    }
    if (ch === ' ' || ch === '\t') { if (lineStart) continue; result += ch; continue }
    if (lineStart) { result += tab.repeat(indent); lineStart = false }
    result += ch
  }
  return result.trimEnd()
}

function RawView({ body, search }: { body: string; search: string }) {
  return (
    <pre className="px-5 py-4 font-mono text-[13px] text-text-tertiary whitespace-pre-wrap leading-relaxed">
      {search ? highlightText(body, search) : body}
    </pre>
  )
}

function HexView({ body, isBase64 = false }: { body: string; isBase64?: boolean }) {
  const bytes = useMemo(() => {
    if (isBase64) {
      try {
        const raw = atob(body)
        const arr = new Uint8Array(raw.length)
        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
        return arr
      } catch {
        return new TextEncoder().encode(body)
      }
    }
    return new TextEncoder().encode(body)
  }, [body, isBase64])

  const lines = useMemo(() => {
    const result: string[] = []
    for (let i = 0; i < bytes.length; i += 16) {
      const offset = i.toString(16).padStart(8, '0')
      const chunk = bytes.slice(i, i + 16)

      const hexParts: string[] = []
      for (let j = 0; j < 16; j++) {
        hexParts.push(j < chunk.length ? chunk[j].toString(16).padStart(2, '0') : '  ')
      }
      const hexLeft = hexParts.slice(0, 8).join(' ')
      const hexRight = hexParts.slice(8).join(' ')

      const ascii = Array.from(chunk)
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
        .join('')
        .padEnd(16)

      result.push(`${offset}  ${hexLeft}  ${hexRight}  |${ascii}|`)
    }
    return result
  }, [bytes])

  return (
    <pre className="px-5 py-4 font-mono text-[12px] leading-relaxed">
      {lines.map((line, i) => (
        <div key={i} className="hover:bg-bg-hover/30 rounded">
          <span className="text-text-tertiary">{line.slice(0, 10)}</span>
          <span className="text-text-secondary">{line.slice(10, 59)}</span>
          <span className="text-text-tertiary">{line.slice(59)}</span>
        </div>
      ))}
    </pre>
  )
}

function ImageView({ body, contentType, isBase64 = false }: { body: string; contentType: string; isBase64?: boolean }) {
  const [zoom, setZoom] = useState(100)
  const [fit, setFit] = useState(true)
  const [error, setError] = useState(false)

  const mimeType = contentType.split(';')[0].trim() || 'image/png'
  const isImageType = mimeType.startsWith('image/')

  const src = useMemo(() => {
    if (!isImageType && !isBase64) return ''
    if (isBase64) {
      return `data:${mimeType};base64,${body}`
    }
    const isDataUrl = body.trim().startsWith('data:')
    const isUrl = body.trim().startsWith('http')
    if (isDataUrl) return body.trim()
    if (isUrl) return body.trim()
    // Try to create base64 data URL from text body
    try {
      return `data:${mimeType};base64,${btoa(body)}`
    } catch {
      return ''
    }
  }, [body, mimeType, isBase64, isImageType])

  if (!isImageType && !isBase64) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-tertiary gap-2">
        <FileWarning size={28} className="opacity-50" />
        <p className="text-[13px] text-text-tertiary">当前响应不是图片类型</p>
        <p className="text-[10px]">Content-Type: {mimeType}</p>
      </div>
    )
  }

  if (error || !src) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-tertiary gap-2">
        <FileWarning size={28} className="opacity-50" />
        <p className="text-[13px] text-text-tertiary">无法渲染为图片</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 shrink-0 bg-bg-secondary">
        <button
          onClick={() => { setFit(true); setZoom(100) }}
          className={`px-2 py-1 text-[12px] rounded-md transition-colors ${fit ? 'bg-bg-active text-text-primary font-medium' : 'text-text-tertiary hover:text-text-primary hover:bg-bg-hover'}`}
        >
          <Maximize size={12} className="inline mr-1" />
          适应
        </button>
        <button
          onClick={() => { setFit(false); setZoom(Math.min(zoom + 25, 400)) }}
          className="p-1 text-text-tertiary hover:text-text-primary rounded-md hover:bg-bg-hover transition-colors"
          title="放大"
          aria-label="放大"
        >
          <ZoomIn size={12} />
        </button>
        <button
          onClick={() => { setFit(false); setZoom(Math.max(zoom - 25, 25)) }}
          className="p-1 text-text-tertiary hover:text-text-primary rounded-md hover:bg-bg-hover transition-colors"
          title="缩小"
          aria-label="缩小"
        >
          <ZoomOut size={12} />
        </button>
        {!fit && <span className="text-[12px] text-text-tertiary font-mono">{zoom}%</span>}
        <span className="ml-auto text-[10px] text-text-tertiary">{mimeType}</span>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[repeating-conic-gradient(var(--color-bg-hover)_0%_25%,var(--color-bg-primary)_0%_50%)_50%/16px_16px]">
        <img
          src={src}
          alt="Response image"
          className="max-h-full"
          style={fit ? { maxWidth: '100%', objectFit: 'contain' } : { width: `${zoom}%` }}
          onError={() => setError(true)}
        />
      </div>
    </div>
  )
}

function highlightText(text: string, query: string) {
  if (!query) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-warning/15 text-text-primary rounded-sm px-0.5">{part}</mark>
      : part
  )
}
