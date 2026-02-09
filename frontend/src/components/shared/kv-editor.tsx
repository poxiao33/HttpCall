import { useState, useCallback, useRef, useEffect } from 'react'
import type { KeyValuePair } from '../../types/request'
import { X, Plus, MessageSquare } from 'lucide-react'

interface KvEditorProps {
  items: KeyValuePair[]
  onUpdate: (id: string, field: 'key' | 'value' | 'enabled' | 'note', val: string | boolean) => void
  onAdd: () => void
  onRemove: (id: string) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
}

export function KvEditor({ items, onUpdate, onAdd, onRemove, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }: KvEditorProps) {
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const noteRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingNote && noteRef.current) noteRef.current.focus()
  }, [editingNote])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string, field: 'key' | 'value') => {
    if (e.key === 'Tab' && field === 'value' && !e.shiftKey) {
      const idx = items.findIndex(i => i.id === id)
      if (idx === items.length - 1) {
        e.preventDefault()
        onAdd()
      }
    }
  }, [items, onAdd])

  return (
    <div className="flex flex-col">
      {items.map((item, index) => (
        <div key={item.id} className="group">
          <div className={`kv-row grid grid-cols-[36px_1fr_1fr_56px] gap-0 items-center h-9 ${
            index % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary/40'
          } hover:bg-bg-hover rounded-md transition-colors`}>
            <label className="flex items-center justify-center h-full cursor-pointer">
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={(e) => onUpdate(item.id, 'enabled', e.target.checked)}
                className="w-3.5 h-3.5 accent-accent"
              />
            </label>
            <input
              type="text"
              value={item.key}
              onChange={(e) => onUpdate(item.id, 'key', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, item.id, 'key')}
              placeholder={keyPlaceholder}
              className="h-full px-2.5 bg-transparent outline-none text-text-primary placeholder:text-text-tertiary font-mono text-[12px]"
            />
            <input
              type="text"
              value={item.value}
              onChange={(e) => onUpdate(item.id, 'value', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, item.id, 'value')}
              placeholder={valuePlaceholder}
              className="h-full px-2.5 bg-transparent outline-none text-text-primary placeholder:text-text-tertiary font-mono text-[12px]"
            />
            <div className="flex items-center justify-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingNote(editingNote === item.id ? null : item.id)}
                className={`p-1 rounded-md hover:bg-bg-active transition-colors ${item.note ? 'text-text-secondary' : 'text-text-tertiary'}`}
                title="备注"
                aria-label="备注"
              >
                <MessageSquare size={12} />
              </button>
              <button
                onClick={() => onRemove(item.id)}
                className="p-1 rounded-md text-text-tertiary hover:text-error hover:bg-bg-active transition-colors"
                title="删除"
                aria-label="删除"
              >
                <X size={12} />
              </button>
            </div>
          </div>
          {editingNote === item.id && (
            <div className="px-9 py-2 bg-bg-tertiary/30">
              <input
                ref={noteRef}
                type="text"
                value={item.note || ''}
                onChange={(e) => onUpdate(item.id, 'note', e.target.value)}
                placeholder="添加参数备注..."
                className="w-full h-7 px-2.5 bg-bg-input rounded-md text-[12px] text-text-secondary outline-none"
                onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') setEditingNote(null) }}
              />
            </div>
          )}
        </div>
      ))}
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 px-4 py-2 text-text-tertiary hover:text-text-secondary text-[12px] hover:bg-bg-hover/30 rounded-md transition-colors"
      >
        <Plus size={12} />
        添加
      </button>
    </div>
  )
}
