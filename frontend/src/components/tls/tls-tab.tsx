import { useState } from 'react'
import { useTlsStore } from '../../stores/tls-store'
import { TLS_PRESETS } from '../../types/tls'
import { Fingerprint, Check, Save, Upload, Download, Trash2, ExternalLink } from 'lucide-react'
import { ExportToFile } from '../../../wailsjs/go/main/App'
import { BrowserOpenURL } from '../../../wailsjs/runtime/runtime'

function FingerprintRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-[11px] text-text-tertiary mb-1">{label}</label>
      <div className="px-3 py-2.5 bg-bg-primary rounded-lg font-mono text-[12px] text-text-secondary break-all leading-relaxed selectable-content">
        {value || '-'}
      </div>
    </div>
  )
}

function EditableFingerprintRow({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div>
      <label className="block text-[11px] text-text-tertiary mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-8 px-3 bg-bg-input rounded-md font-mono text-[12px] text-text-primary outline-none placeholder:text-text-tertiary break-all leading-relaxed"
      />
    </div>
  )
}

function PresetGrid({ preset, onSelect }: { preset: string; onSelect: (id: string) => void }) {
  return (
    <div className="bg-bg-secondary rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-bg-tertiary/30">
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">TLS 指纹预设</span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-4 gap-2">
          {TLS_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`relative flex flex-col items-start px-3 py-2.5 rounded-md text-left transition-all ${
                preset === p.id
                  ? 'bg-bg-active text-text-primary'
                  : 'bg-bg-primary hover:bg-bg-hover text-text-secondary'
              }`}
            >
              {preset === p.id && (
                <div className="absolute top-2 right-2">
                  <Check size={12} className="text-text-primary" />
                </div>
              )}
              <span className={`text-[12px] ${preset === p.id ? 'font-medium' : ''}`}>
                {p.label}
              </span>
              <span className="text-[10px] text-text-tertiary mt-0.5">{p.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TlsTab() {
  const {
    config, savedTemplates,
    setPreset, setCustomJa3, setCustomJa4, setCustomAkamai,
    saveTemplate, deleteTemplate, loadTemplate,
    importTemplates, exportTemplates,
  } = useTlsStore()
  const [templateName, setTemplateName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  const currentPreset = TLS_PRESETS.find(p => p.id === config.preset)
  const isCustom = config.preset === 'custom'

  return (
    <div className="space-y-4">
      <PresetGrid preset={config.preset} onSelect={setPreset} />

      <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-secondary/60 rounded-lg text-[11px] text-text-tertiary">
        <span>提示：访问</span>
        <button
          onClick={() => BrowserOpenURL('https://tls.browserleaks.com/json')}
          className="inline-flex items-center gap-1 text-accent hover:underline transition-colors"
        >
          tls.browserleaks.com/json
          <ExternalLink size={10} />
        </button>
        <span>可获取浏览器的 TLS 指纹参数</span>
      </div>

      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-bg-tertiary/30 flex items-center gap-2">
          <Fingerprint size={14} className="text-text-tertiary" />
          <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
            {isCustom ? '自定义指纹' : `${currentPreset?.name ?? ''} 指纹信息`}
          </span>
        </div>
        <div className="p-4 space-y-3">
          {isCustom ? (
            <>
              <EditableFingerprintRow
                label="JA3"
                value={config.customJa3}
                onChange={setCustomJa3}
                placeholder="771,4865-4866-4867-49195-49199-...,0-23-65281-10-11-..."
              />
              <EditableFingerprintRow
                label="JA4"
                value={config.customJa4}
                onChange={setCustomJa4}
                placeholder="t13d1516h2_8daaf6152771_b0da82dd1658"
              />
              <EditableFingerprintRow
                label="Akamai HTTP/2"
                value={config.customAkamai}
                onChange={setCustomAkamai}
                placeholder="1:65536;2:0;3:1000;4:6291456;6:262144|15663105|0|m,a,s,p"
              />
            </>
          ) : (
            <>
              <FingerprintRow label="JA3" value={currentPreset?.ja3 ?? ''} />
              <FingerprintRow label="JA4" value={currentPreset?.ja4 ?? ''} />
              <FingerprintRow label="Akamai HTTP/2" value={currentPreset?.akamai ?? ''} />
            </>
          )}
        </div>
      </div>

      <TemplateManager
        savedTemplates={savedTemplates}
        showSaveDialog={showSaveDialog}
        templateName={templateName}
        onShowSave={() => setShowSaveDialog(true)}
        onHideSave={() => { setTemplateName(''); setShowSaveDialog(false) }}
        onNameChange={setTemplateName}
        onSave={(name) => { saveTemplate(name); setTemplateName(''); setShowSaveDialog(false) }}
        onLoad={loadTemplate}
        onDelete={deleteTemplate}
        onImport={importTemplates}
        onExport={exportTemplates}
      />
    </div>
  )
}

function TemplateManager({ savedTemplates, showSaveDialog, templateName, onShowSave, onHideSave, onNameChange, onSave, onLoad, onDelete, onImport, onExport }: {
  savedTemplates: { id: string; name: string; createdAt: string }[]
  showSaveDialog: boolean; templateName: string
  onShowSave: () => void; onHideSave: () => void; onNameChange: (v: string) => void
  onSave: (name: string) => void; onLoad: (id: string) => void; onDelete: (id: string) => void
  onImport: (data: never[]) => void; onExport: () => unknown[]
}) {
  return (
    <div className="bg-bg-secondary rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-bg-tertiary/30 flex items-center gap-2">
        <Save size={14} className="text-text-tertiary" />
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">模板管理</span>
      </div>
      <div className="p-4 space-y-3">
        {showSaveDialog ? (
          <div className="flex gap-2">
            <input
              type="text" value={templateName} onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && templateName.trim()) onSave(templateName.trim()) }}
              placeholder="输入模板名称"
              className="flex-1 h-8 px-3 bg-bg-input rounded-md text-[12px] text-text-primary outline-none placeholder:text-text-tertiary"
              autoFocus
            />
            <button onClick={() => { if (templateName.trim()) onSave(templateName.trim()) }} className="btn-base btn-primary px-4 py-1.5 text-[12px]">保存</button>
            <button onClick={onHideSave} className="btn-base btn-ghost px-4 py-1.5 text-[12px]">取消</button>
          </div>
        ) : (
          <button onClick={onShowSave} className="btn-base btn-secondary w-full h-8 px-3 text-[12px]">
            <Save size={14} /> 保存当前配置为模板
          </button>
        )}

        {savedTemplates.length > 0 && (
          <div className="space-y-2">
            <label className="block text-[11px] text-text-tertiary">已保存的模板</label>
            <div className="space-y-1.5">
              {savedTemplates.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2.5 bg-bg-primary rounded-md hover:bg-bg-hover/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-text-primary font-medium truncate">{t.name}</div>
                    <div className="text-[10px] text-text-tertiary mt-0.5">
                      {new Date(t.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-3">
                    <button onClick={() => onLoad(t.id)} className="btn-base btn-secondary px-3 py-1 text-[12px]">加载</button>
                    <button onClick={() => onDelete(t.id)} className="p-1.5 text-text-tertiary hover:text-error hover:bg-error/10 rounded-md transition-colors" aria-label="删除模板"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'; input.accept = 'application/json'
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = (ev) => { try { onImport(JSON.parse(ev.target?.result as string)) } catch { alert('导入失败：JSON 格式错误') } }
                  reader.readAsText(file)
                }
              }
              input.click()
            }}
            className="btn-base btn-secondary flex-1 h-8 px-3 text-[12px]"
          >
            <Upload size={14} /> 导入
          </button>
          <button
            onClick={async () => {
              const data = JSON.stringify(onExport(), null, 2)
              const filename = `tls-templates-${new Date().toISOString().split('T')[0]}.json`
              try { await ExportToFile(data, filename) } catch {}
            }}
            className="btn-base btn-secondary flex-1 h-8 px-3 text-[12px]"
          >
            <Download size={14} /> 导出
          </button>
        </div>
      </div>
    </div>
  )
}
