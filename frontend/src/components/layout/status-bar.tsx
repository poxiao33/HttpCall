import { useRequestStore } from '../../stores/request-store'
import { useHistoryStore } from '../../stores/history-store'
import { useTlsStore } from '../../stores/tls-store'
import { fmtBytes } from '../../utils/helpers'

export function StatusBar() {
  const { tabs, activeTabId } = useRequestStore()
  const { entries } = useHistoryStore()
  const { config } = useTlsStore()

  const tab = tabs.find((t) => t.request.id === activeTabId)
  const loading = tab?.loading ?? false
  const response = tab?.response ?? null

  return (
    <div className="flex items-center justify-between h-6 px-4 bg-bg-secondary text-[11px] shrink-0 status-bar-shadow">
      <div className="flex items-center gap-4 text-text-tertiary selectable-content">
        <span>{tabs.length} Tabs</span>
        <span>{entries.length} History</span>
        <span className="font-mono">{config.preset}</span>
      </div>
      <div className="flex items-center gap-3 selectable-content">
        {loading ? (
          <span className="flex items-center gap-1.5 text-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            请求中...
          </span>
        ) : response ? (
          <span className="flex items-center gap-1.5 text-text-tertiary">
            <span className={`w-1.5 h-1.5 rounded-full ${response.status < 400 ? 'bg-success' : 'bg-error'}`} />
            <span className="font-mono">{response.status}</span>
            <span className="text-text-tertiary/50">·</span>
            <span className="font-mono">{response.timing.total}ms</span>
            <span className="text-text-tertiary/50">·</span>
            <span className="font-mono">{fmtBytes(response.size)}</span>
          </span>
        ) : (
          <span className="text-text-tertiary">就绪</span>
        )}
      </div>
    </div>
  )
}
