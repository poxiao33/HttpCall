import { useRequestStore } from '../../stores/request-store'
import { KvEditor } from '../shared/kv-editor'
import type { KeyValuePair } from '../../types/request'

const TABS = [
  { id: 'params', label: 'Params' },
  { id: 'headers', label: 'Headers' },
  { id: 'body', label: 'Body' },
  { id: 'auth', label: 'Auth' },
  { id: 'tls', label: 'TLS' },
]

export function RequestTabs() {
  const store = useRequestStore()
  const current = store.currentTab()?.request
  const activeTab = store.activePanel
  const setActiveTab = store.setActivePanel

  const paramCount = current?.params.filter((p: KeyValuePair) => p.key).length ?? 0
  const headerCount = current?.headers.filter((h: KeyValuePair) => h.key).length ?? 0

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center h-9 bg-bg-secondary/70">
        {TABS.map((tab) => {
          const count = tab.id === 'params' ? paramCount : tab.id === 'headers' ? headerCount : 0
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 h-9 text-[13px] transition-colors ${
                activeTab === tab.id
                  ? 'text-text-primary font-semibold'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded bg-bg-active text-text-secondary">
                  {count}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="tab-indicator" />
              )}
            </button>
          )
        })}
      </div>
      <div className="flex-1 overflow-auto">
        <TabContent tab={activeTab} />
      </div>
    </div>
  )
}

function TabContent({ tab }: { tab: string }) {
  switch (tab) {
    case 'params': return <ParamsTab />
    case 'headers': return <HeadersTab />
    case 'body': return <BodyTab />
    case 'auth': return <AuthTab />
    case 'tls': return <TlsTabPlaceholder />
    default: return null
  }
}

function ParamsTab() {
  const store = useRequestStore()
  const current = store.currentTab()?.request
  if (!current) return null
  return (
    <KvEditor
      items={current.params}
      onUpdate={store.updateParam}
      onAdd={store.addParam}
      onRemove={store.removeParam}
      keyPlaceholder="参数名"
      valuePlaceholder="参数值"
    />
  )
}

function HeadersTab() {
  const store = useRequestStore()
  const current = store.currentTab()?.request
  if (!current) return null
  return (
    <KvEditor
      items={current.headers}
      onUpdate={store.updateHeader}
      onAdd={store.addHeader}
      onRemove={store.removeHeader}
      keyPlaceholder="Header"
      valuePlaceholder="Value"
    />
  )
}

function BodyTab() {
  const store = useRequestStore()
  const current = store.currentTab()?.request
  if (!current) return null
  const types = [
    { id: 'none' as const, label: 'None' },
    { id: 'raw' as const, label: 'Raw' },
    { id: 'form' as const, label: 'Form' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-3 py-2 bg-bg-tertiary/15">
        {types.map((t) => (
          <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="bodyType"
              checked={current.bodyType === t.id}
              onChange={() => store.setBodyType(t.id)}
              className="w-3.5 h-3.5 accent-accent"
            />
            <span className={`text-[11px] ${current.bodyType === t.id ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
              {t.label}
            </span>
          </label>
        ))}
      </div>
      {current.bodyType !== 'none' && (
        <textarea
          value={current.body}
          onChange={(e) => store.setBody(e.target.value)}
          placeholder={'请求体内容...'}
          className="flex-1 p-3 bg-bg-primary font-mono text-[13px] text-text-primary resize-none outline-none placeholder:text-text-tertiary"
          spellCheck={false}
        />
      )}
    </div>
  )
}

function AuthTab() {
  const store = useRequestStore()
  const current = store.currentTab()?.request
  if (!current) return null
  const authTypes = [
    { id: 'none' as const, label: 'None' },
    { id: 'bearer' as const, label: 'Bearer Token' },
    { id: 'basic' as const, label: 'Basic Auth' },
    { id: 'apikey' as const, label: 'API Key' },
  ]

  return (
    <div className="p-3">
      <div className="flex items-center gap-3 mb-4">
        {authTypes.map((t) => (
          <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="authType"
              checked={current.auth.type === t.id}
              onChange={() => store.setAuth({ ...current.auth, type: t.id })}
              className="w-3.5 h-3.5 accent-accent"
            />
            <span className={`text-[11px] ${current.auth.type === t.id ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
              {t.label}
            </span>
          </label>
        ))}
      </div>
      {current.auth.type === 'bearer' && (
        <div>
          <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1">Token</label>
          <input
            type="text"
            value={current.auth.bearer || ''}
            onChange={(e) => store.setAuth({ ...current.auth, bearer: e.target.value })}
            placeholder="Bearer token..."
            className="w-full h-8 px-3 bg-bg-input rounded-md text-[12px] font-mono text-text-primary outline-none placeholder:text-text-tertiary"
          />
        </div>
      )}
      {current.auth.type === 'basic' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1">Username</label>
            <input
              type="text"
              value={current.auth.basic?.username || ''}
              onChange={(e) => store.setAuth({ ...current.auth, basic: { username: e.target.value, password: current.auth.basic?.password || '' } })}
              className="w-full h-8 px-3 bg-bg-input rounded-md text-[12px] font-mono text-text-primary outline-none placeholder:text-text-tertiary"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              value={current.auth.basic?.password || ''}
              onChange={(e) => store.setAuth({ ...current.auth, basic: { username: current.auth.basic?.username || '', password: e.target.value } })}
              className="w-full h-8 px-3 bg-bg-input rounded-md text-[12px] font-mono text-text-primary outline-none placeholder:text-text-tertiary"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function TlsTabPlaceholder() {
  return (
    <div className="p-3 text-[12px] text-text-secondary">
      TLS 配置面板（见右侧 TLS 面板）
    </div>
  )
}