import { useState, useEffect } from 'react'
import { useRequestStore } from '../../stores/request-store'
import type { ProxyConfig } from '../../types/request'

const PROXY_TYPES: { id: ProxyConfig['type']; label: string }[] = [
  { id: 'none', label: '不使用代理' },
  { id: 'http', label: 'HTTP' },
  { id: 'socks5', label: 'SOCKS5' },
]

export function OptionsTab() {
  const store = useRequestStore()
  const [showProxyAuth, setShowProxyAuth] = useState(false)

  const tab = store.tabs.find((t) => t.request.id === store.activeTabId)

  useEffect(() => {
    setShowProxyAuth(!!tab?.request.proxy?.auth)
  }, [store.activeTabId, tab?.request.proxy?.auth])
  if (!tab) return null

  const { request } = tab
  const proxy = request.proxy ?? { type: 'none' as const, host: '', port: 8080 }

  const handleProxyTypeChange = (type: ProxyConfig['type']) => {
    store.setProxy({ type, host: proxy.host || '', port: proxy.port || 8080, auth: proxy.auth })
    if (type === 'none') setShowProxyAuth(false)
  }

  const handleProxyHostChange = (host: string) => {
    store.setProxy({ ...proxy, host })
  }

  const handleProxyPortChange = (port: number) => {
    store.setProxy({ ...proxy, port })
  }

  const handleProxyAuthToggle = (enabled: boolean) => {
    setShowProxyAuth(enabled)
    if (enabled) {
      store.setProxy({ ...proxy, auth: { username: '', password: '' } })
    } else {
      const rest = { ...proxy }
      delete rest.auth
      store.setProxy(rest)
    }
  }

  const handleProxyAuthChange = (field: 'username' | 'password', value: string) => {
    if (!proxy.auth) return
    store.setProxy({ ...proxy, auth: { ...proxy.auth, [field]: value } })
  }

  return (
    <div className="space-y-3">
      {/* Proxy Settings */}
      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-bg-tertiary/30">
          <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">代理设置</span>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[11px] text-text-tertiary mb-1.5">代理类型</label>
            <div className="flex gap-1.5">
              {PROXY_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleProxyTypeChange(t.id)}
                  className={`px-3 py-1.5 text-[12px] rounded-md transition-colors ${
                    proxy.type === t.id
                      ? 'bg-bg-active text-text-primary font-medium'
                      : 'bg-bg-primary text-text-tertiary hover:text-text-secondary hover:bg-bg-hover'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {proxy.type !== 'none' && (
            <>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div>
                  <label className="block text-[11px] text-text-tertiary mb-1.5">主机地址</label>
                  <input
                    type="text"
                    value={proxy.host}
                    onChange={(e) => handleProxyHostChange(e.target.value)}
                    placeholder="例如: 127.0.0.1"
                    className="w-full h-8 px-3 bg-bg-input rounded-md text-[12px] text-text-primary outline-none placeholder:text-text-tertiary"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-[11px] text-text-tertiary mb-1.5">端口</label>
                  <input
                    type="number"
                    value={proxy.port || ''}
                    onChange={(e) => handleProxyPortChange(parseInt(e.target.value) || 0)}
                    placeholder="8080"
                    className="w-full h-8 px-3 bg-bg-input rounded-md text-[12px] text-text-primary outline-none placeholder:text-text-tertiary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleProxyAuthToggle(!showProxyAuth)}
                  className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                    showProxyAuth ? 'bg-accent' : 'bg-bg-tertiary'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    showProxyAuth ? 'translate-x-4' : ''
                  }`} />
                </button>
                <span className="text-[12px] text-text-secondary">需要身份验证</span>
              </div>

              {showProxyAuth && (
                <div className="space-y-2 pl-5 border-l-2 border-bg-tertiary/50">
                  <div>
                    <label className="block text-[11px] text-text-tertiary mb-1.5">用户名</label>
                    <input
                      type="text"
                      value={proxy.auth?.username || ''}
                      onChange={(e) => handleProxyAuthChange('username', e.target.value)}
                      placeholder="代理用户名"
                      className="w-full h-8 px-3 bg-bg-input rounded-md text-[12px] text-text-primary outline-none placeholder:text-text-tertiary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-tertiary mb-1.5">密码</label>
                    <input
                      type="password"
                      value={proxy.auth?.password || ''}
                      onChange={(e) => handleProxyAuthChange('password', e.target.value)}
                      placeholder="代理密码"
                      className="w-full h-8 px-3 bg-bg-input rounded-md text-[12px] text-text-primary outline-none placeholder:text-text-tertiary"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Redirect Settings */}
      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-bg-tertiary/30">
          <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">重定向设置</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => store.setFollowRedirects(!request.followRedirects)}
              className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                request.followRedirects ? 'bg-accent' : 'bg-bg-tertiary'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                request.followRedirects ? 'translate-x-4' : ''
              }`} />
            </button>
            <span className="text-[12px] text-text-secondary">跟随重定向</span>
          </div>

          {request.followRedirects && (
            <div className="pl-5 border-l-2 border-bg-tertiary/50">
              <label className="block text-[11px] text-text-tertiary mb-1.5">最大跳转次数</label>
              <input
                type="number"
                value={request.maxRedirects}
                onChange={(e) => store.setMaxRedirects(parseInt(e.target.value) || 0)}
                min="0"
                max="20"
                className="w-28 h-8 px-3 bg-bg-input rounded-md text-[12px] text-text-primary outline-none"
              />
              <p className="text-[11px] text-text-tertiary mt-1">建议值: 5-10</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
