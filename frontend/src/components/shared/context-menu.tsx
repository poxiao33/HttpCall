import { useEffect, useRef, useState, useCallback } from 'react'
import { Clipboard, ClipboardPaste, Scissors, TextSelect } from 'lucide-react'
import { ClipboardGetText, ClipboardSetText } from '../../../wailsjs/runtime/runtime'

interface MenuPosition {
  x: number
  y: number
}

interface MenuItem {
  label: string
  icon: typeof Clipboard
  action: () => void
  disabled?: boolean
}

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [position, setPosition] = useState<MenuPosition | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const menuRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setPosition(null), [])

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      const tag = el.tagName.toLowerCase()
      const isEditable = tag === 'input' || tag === 'textarea' || el.isContentEditable
      const isSelectable = tag === 'pre' || tag === 'code'
        || el.closest('pre, code, .selectable-content') !== null

      if (!isEditable && !isSelectable) {
        e.preventDefault()
        setPosition(null)
        return
      }

      e.preventDefault()
      const selection = window.getSelection()
      const hasSelection = !!(selection && selection.toString().trim())

      const menuItems: MenuItem[] = []

      if (isEditable) {
        menuItems.push({
          label: '剪切',
          icon: Scissors,
          action: () => { document.execCommand('cut'); close() },
          disabled: !hasSelection,
        })
      }

      menuItems.push({
        label: '复制',
        icon: Clipboard,
        action: () => {
          const text = window.getSelection()?.toString() ?? ''
          if (text) ClipboardSetText(text)
          close()
        },
        disabled: !hasSelection,
      })

      if (isEditable) {
        menuItems.push({
          label: '粘贴',
          icon: ClipboardPaste,
          action: async () => {
            try {
              const text = await ClipboardGetText()
              document.execCommand('insertText', false, text)
            } catch {
              // clipboard unavailable
            }
            close()
          },
        })
      }

      menuItems.push({
        label: '全选',
        icon: TextSelect,
        action: () => {
          if (isEditable && (tag === 'input' || tag === 'textarea')) {
            (el as HTMLInputElement).select()
          } else {
            const range = document.createRange()
            const container = el.closest('.selectable-content')
              ?? el.closest('pre') ?? el.closest('code') ?? el
            range.selectNodeContents(container)
            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(range)
          }
          close()
        },
      })

      setItems(menuItems)

      const menuW = 160
      const menuH = menuItems.length * 32 + 8
      const x = e.clientX + menuW > window.innerWidth
        ? e.clientX - menuW : e.clientX
      const y = e.clientY + menuH > window.innerHeight
        ? e.clientY - menuH : e.clientY
      setPosition({ x: Math.max(0, x), y: Math.max(0, y) })
    }

    const handleClick = () => setPosition(null)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPosition(null)
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [close])

  return (
    <>
      {children}
      {position && (
        <div
          ref={menuRef}
          className="fixed z-[9999] min-w-[160px] py-1 bg-bg-elevated rounded-lg shadow-2xl"
          style={{ left: position.x, top: position.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              disabled={item.disabled}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-bg-hover hover:text-text-primary rounded-md transition-colors disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-text-secondary"
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}