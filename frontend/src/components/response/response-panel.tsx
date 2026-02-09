import { useRequestStore } from '../../stores/request-store'
import { Clock, ArrowDownToLine } from 'lucide-react'
import { RespBody } from './response-body-views'
import { RespHeaders, RespTls, RespRedirects, RespConnTrace } from './response-tabs'
import { fmtBytes } from '../../utils/helpers'

const RESP_TABS = [
  { id: 'body', label: 'Body' },
  { id: 'headers', label: 'Headers' },
  { id: 'trace', label: '连接' },
  { id: 'tls', label: 'TLS' },
  { id: 'redirects', label: '重定向' },
]

export function ResponsePanel() {
  const store = useRequestStore()
  const tab = store.tabs.find((t) => t.request.id === store.activeTabId)
  const response = tab?.response ?? null
  const loading = tab?.loading ?? false

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-text-tertiary">
          <div className="w-3.5 h-3.5 border-[1.5px] border-text-tertiary border-t-transparent rounded-full animate-spin" />
          <span className="text-[13px]">请求中...</span>
        </div>
      </div>
    )
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <ArrowDownToLine size={28} strokeWidth={1.5} className="text-text-tertiary/50" />
        <span className="text-[13px] text-text-tertiary">发送请求查看响应</span>
      </div>
    )
  }

  const statusColor = response.status < 300 ? 'text-success' : response.status < 400 ? 'text-info' : response.status < 500 ? 'text-warning' : 'text-error'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-9 bg-bg-secondary shrink-0">
        <div className="flex items-center gap-0">
          {RESP_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => store.setResponseTab(t.id)}
              className={`relative px-3 h-9 text-[13px] transition-colors ${
                store.responseTab === t.id ? 'text-text-primary font-semibold' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {t.label}
              {store.responseTab === t.id && (
                <div className="tab-indicator" />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[11px] selectable-content">
          <span className={`font-mono font-medium ${statusColor}`}>{response.status} {response.statusText}</span>
          <span className="flex items-center gap-1 text-text-tertiary"><Clock size={12} />{response.timing.total}ms</span>
          <span className="text-text-tertiary">{fmtBytes(response.size)}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {store.responseTab === 'body' && <RespBody body={response.body} headers={response.headers} isBase64={response.isBase64} contentEncoding={response.contentEncoding} />}
        {store.responseTab === 'headers' && <RespHeaders headers={response.headers} />}
        {store.responseTab === 'trace' && <RespConnTrace timing={response.timing} trace={response.connTrace} />}
        {store.responseTab === 'tls' && <RespTls info={response.tlsInfo} />}
        {store.responseTab === 'redirects' && <RespRedirects redirects={response.redirects} />}
      </div>
    </div>
  )
}
