import { Lock, ArrowRight, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { ConnTrace, ConnEvent, TimingData } from '../../types/request'

interface RespHeadersProps {
  headers: Record<string, string>
}

export function RespHeaders({ headers }: RespHeadersProps) {
  return (
    <div className="px-5 py-3 selectable-content">
      {Object.entries(headers).map(([key, value], index) => (
        <div key={key} className={`flex py-2 ${index % 2 === 0 ? '' : 'bg-bg-secondary/30'} rounded px-2 -mx-2`}>
          <span className="w-52 shrink-0 font-mono text-[11px] text-text-secondary">{key}</span>
          <span className="font-mono text-[12px] text-text-primary break-all">{value}</span>
        </div>
      ))}
    </div>
  )
}

interface TlsInfo {
  version: string
  cipherSuite: string
  alpn?: string
  ja3Hash?: string
}

interface RespTlsProps {
  info?: TlsInfo
}

export function RespTls({ info }: RespTlsProps) {
  if (!info) return <div className="flex items-center justify-center h-28 text-[13px] text-text-tertiary">无 TLS 握手信息</div>
  const items = [
    { label: 'TLS Version', value: info.version },
    { label: 'Cipher Suite', value: info.cipherSuite },
    { label: 'ALPN', value: info.alpn || '-' },
    { label: 'JA3 Hash', value: info.ja3Hash || '-' },
  ]
  return (
    <div className="px-5 py-3 selectable-content">
      {items.map((item, index) => (
        <div key={item.label} className={`flex py-2.5 ${index % 2 === 0 ? '' : 'bg-bg-secondary/30'} rounded px-2 -mx-2`}>
          <span className="w-36 shrink-0 text-[11px] text-text-tertiary flex items-center gap-1.5"><Lock size={12} />{item.label}</span>
          <span className="font-mono text-[12px] text-text-primary break-all">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

interface RedirectHop {
  url: string
  status: number
  statusText: string
  headers: Record<string, string>
}

interface RespRedirectsProps {
  redirects?: RedirectHop[]
}

export function RespRedirects({ redirects }: RespRedirectsProps) {
  if (!redirects || redirects.length === 0) {
    return <div className="flex items-center justify-center h-28 text-[13px] text-text-tertiary">无重定向</div>
  }
  const keyHeaders = ['location', 'set-cookie', 'cache-control', 'content-type']
  return (
    <div className="px-5 py-4 space-y-3 selectable-content">
      {redirects.map((hop, index) => {
        const statusColor = hop.status >= 300 && hop.status < 400 ? 'text-warning' : 'text-text-primary'
        const truncatedUrl = hop.url.length > 80 ? hop.url.slice(0, 77) + '...' : hop.url
        const relevantHeaders = Object.entries(hop.headers).filter(([key]) => keyHeaders.includes(key.toLowerCase()))
        return (
          <div key={index} className="rounded-lg p-3.5 bg-bg-secondary space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-text-tertiary font-medium">#{index + 1}</span>
              <span className={`font-mono text-[11px] font-medium ${statusColor}`}>{hop.status} {hop.statusText}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[11px] text-text-tertiary shrink-0 mt-0.5">URL:</span>
              <span className="font-mono text-[12px] text-text-primary break-all" title={hop.url}>{truncatedUrl}</span>
            </div>
            {relevantHeaders.length > 0 && (
              <div className="pt-2 space-y-1.5">
                {relevantHeaders.map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-[11px] text-text-secondary font-mono shrink-0 w-28">{key}:</span>
                    <span className="font-mono text-[12px] text-text-tertiary break-all">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface RespConnTraceProps { timing: TimingData; trace?: ConnTrace }

export function RespConnTrace({ timing, trace }: RespConnTraceProps) {
  return (
    <div className="px-5 py-4 space-y-4 selectable-content">
      <TimingWaterfall timing={timing} />
      {trace && (trace.targetAddr || trace.remoteAddr || trace.localAddr) && (
        <div className="flex gap-4 text-[11px] text-text-tertiary pt-2 flex-wrap">
          {trace.targetAddr && <span>目标: {trace.targetAddr}</span>}
          {trace.localAddr && <span>本地: {trace.localAddr}</span>}
          {trace.remoteAddr && <span>远程: {trace.remoteAddr}</span>}
        </div>
      )}
      {trace && trace.events && trace.events.length > 0 ? (
        <div className="space-y-1.5">
          <span className="text-[11px] text-text-tertiary">TLS 握手记录</span>
          {trace.events.map((ev, i) => <ConnEventRow key={i} event={ev} />)}
        </div>
      ) : (
        <div className="text-[13px] text-text-tertiary text-center py-2">无连接追踪数据（仅 HTTPS 可用）</div>
      )}
    </div>
  )
}

function TimingWaterfall({ timing }: { timing: TimingData }) {
  const items = [
    { label: 'TCP Connect', value: timing.tcp, color: 'var(--color-method-get)' },
    { label: 'TLS Handshake', value: timing.tls, color: 'var(--color-warning)' },
    { label: 'TTFB', value: timing.ttfb, color: 'var(--color-method-patch)' },
    { label: 'Download', value: timing.download, color: 'var(--color-method-options)' },
  ]
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-28 text-[11px] text-text-tertiary shrink-0">{item.label}</span>
          <div className="flex-1 h-4 bg-bg-secondary rounded overflow-hidden">
            <div className="h-full rounded transition-all" style={{ width: `${timing.total > 0 ? Math.max((item.value / timing.total) * 100, 3) : 0}%`, backgroundColor: item.color, opacity: 0.6 }} />
          </div>
          <span className="w-14 text-right font-mono text-[11px] text-text-tertiary">{item.value}ms</span>
        </div>
      ))}
      <div className="pt-2.5 mt-1 flex justify-between items-center">
        <span className="text-[11px] text-text-tertiary">Total</span>
        <span className="font-mono text-[13px] text-text-primary font-medium">{timing.total}ms</span>
      </div>
    </div>
  )
}

function ConnEventRow({ event }: { event: ConnEvent }) {
  const [expanded, setExpanded] = useState(false)
  const isSend = event.direction === 'send'
  const colorClass = getEventColor(event.summary)
  return (
    <div className="rounded-lg bg-bg-secondary overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover rounded-t-lg transition-colors">
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="text-[11px] font-mono text-text-tertiary w-16 shrink-0">{event.time < 1 ? event.time.toFixed(2) : event.time.toFixed(1)}ms</span>
        {isSend ? <ArrowRight size={12} className="text-info shrink-0" /> : <ArrowLeft size={12} className="text-success shrink-0" />}
        <span className={`text-[11px] font-medium ${colorClass}`}>{event.summary}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-2 space-y-1">
          {event.detail && <div className="text-[11px] text-text-tertiary pt-1">{event.detail}</div>}
          {event.hexPreview && (
            <pre className="text-[10px] font-mono text-text-tertiary bg-bg-primary rounded-md p-2 overflow-x-auto break-all whitespace-pre-wrap">{formatHex(event.hexPreview)}</pre>
          )}
        </div>
      )}
    </div>
  )
}

function getEventColor(summary: string): string {
  if (summary.includes('ClientHello')) return 'text-info'
  if (summary.includes('ServerHello')) return 'text-success'
  if (summary.includes('Certificate')) return 'text-warning'
  if (summary.includes('ChangeCipherSpec')) return 'text-method-patch'
  if (summary.includes('Finished')) return 'text-success'
  if (summary.includes('Application Data')) return 'text-text-tertiary'
  if (summary.includes('Alert')) return 'text-error'
  return 'text-text-primary'
}

function formatHex(hex: string): string {
  const pairs = hex.match(/.{1,2}/g) || []
  return pairs.join(' ')
}