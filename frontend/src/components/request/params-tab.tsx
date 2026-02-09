import { useRequestStore } from '../../stores/request-store'
import { KvEditor } from '../shared/kv-editor'

export function ParamsTab() {
  const store = useRequestStore()
  const tab = store.tabs.find((t) => t.request.id === store.activeTabId)
  if (!tab) return null

  return (
    <div className="bg-bg-secondary rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-bg-tertiary/30">
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">Query Parameters</span>
      </div>
      <KvEditor
        items={tab.request.params}
        onUpdate={store.updateParam}
        onAdd={store.addParam}
        onRemove={store.removeParam}
        keyPlaceholder="参数名"
        valuePlaceholder="参数值"
      />
    </div>
  )
}
