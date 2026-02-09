import { useUiStore, type ActiveView } from '../../stores/ui-store'
import { Send, Clock, GitCompareArrows, Braces, FolderOpen, Sun, Moon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const NAV_ITEMS: { id: ActiveView; icon: LucideIcon; label: string }[] = [
  { id: 'editor', icon: Send, label: '请求' },
  { id: 'history', icon: Clock, label: '历史' },
  { id: 'compare', icon: GitCompareArrows, label: '对比' },
  { id: 'codec', icon: Braces, label: '编解码' },
  { id: 'collections', icon: FolderOpen, label: '集合' },
]

export function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, theme, toggleTheme } = useUiStore()

  return (
    <nav
      className={`drag-region flex flex-col bg-bg-base shrink-0 transition-[width,padding] duration-200 ${
        sidebarCollapsed ? 'w-[64px] px-2 pt-10 pb-3' : 'w-[210px] px-3 pt-10 pb-3'
      }`}
      role="navigation"
      aria-label="主导航"
    >
      <div className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`no-drag group relative flex items-center w-full h-10 rounded-md transition-all ${
              sidebarCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
            } ${
              activeView === item.id
                ? 'bg-bg-active text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
            title={item.label}
            aria-label={item.label}
            aria-current={activeView === item.id ? 'page' : undefined}
          >
            {activeView === item.id && <div className="nav-active-bar" />}
            <item.icon
              size={16}
              strokeWidth={activeView === item.id ? 2 : 1.5}
              aria-hidden="true"
              className={activeView === item.id ? 'text-text-primary' : 'text-text-tertiary group-hover:text-text-secondary'}
            />
            {!sidebarCollapsed && (
              <span className={`text-[14px] truncate ${
                activeView === item.id ? 'font-semibold text-text-primary' : ''
              }`}>
                {item.label}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-auto pt-3 space-y-2">
        <button
          onClick={toggleTheme}
          className={`no-drag flex items-center w-full h-9 rounded-md transition-all text-text-secondary hover:text-text-primary hover:bg-bg-hover ${
            sidebarCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
          }`}
          title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
        >
          {theme === 'dark' ? (
            <Sun size={16} strokeWidth={1.5} className="text-text-tertiary" />
          ) : (
            <Moon size={16} strokeWidth={1.5} className="text-text-tertiary" />
          )}
          {!sidebarCollapsed && (
            <span className="text-[13px]">{theme === 'dark' ? '亮色模式' : '暗色模式'}</span>
          )}
        </button>

        {sidebarCollapsed ? (
          <div className="mx-auto w-8 h-8 rounded-md bg-bg-secondary flex items-center justify-center text-[10px] text-text-tertiary font-medium">
            HC
          </div>
        ) : (
          <div className="px-3 py-2 rounded-md bg-bg-secondary/60">
            <div className="text-[10px] uppercase tracking-widest text-text-tertiary">Project</div>
            <div className="text-[12px] text-text-secondary mt-0.5">HttpCall</div>
          </div>
        )}
      </div>
    </nav>
  )
}
