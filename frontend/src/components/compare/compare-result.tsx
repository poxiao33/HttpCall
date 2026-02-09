import { useState, useCallback, useRef, useEffect } from 'react'
import { useCompareStore } from '../../stores/compare-store'

const DIMENSIONS = [
  { id: 'query', label: 'Query参数' },
  { id: 'headers', label: 'Headers' },
  { id: 'cookie', label: 'Cookie' },
  { id: 'body', label: 'Body' },
  { id: 'responseHeaders', label: '响应头' },
  { id: 'responseBody', label: '响应体' },
]

const SAME_STYLE = { border: 'var(--color-success)', bg: 'color-mix(in srgb, var(--color-success) 6%, transparent)' }
const DIFF_STYLE = { border: 'var(--color-error)', bg: 'color-mix(in srgb, var(--color-error) 6%, transparent)' }

const MIN_COL = 80
const MAX_COL = 800
const DEFAULT_NAME_COL = 176
const DEFAULT_VAL_COL = 200

function DimensionTabs({ activeDimension, setDimension }: {
  activeDimension: string
  setDimension: (dim: string) => void
}) {
  return (
    <div className="flex items-center bg-bg-secondary/70 shrink-0 h-9">
      {DIMENSIONS.map((dim) => (
        <button
          key={dim.id}
          onClick={() => setDimension(dim.id)}
          className={`relative px-3 h-9 text-[13px] transition-colors ${
            activeDimension === dim.id
              ? 'text-text-primary font-semibold'
              : 'text-text-tertiary hover:text-text-secondary font-medium'
          }`}
        >
          {dim.label}
          {activeDimension === dim.id && (
            <div className="tab-indicator" />
          )}
        </button>
      ))}
    </div>
  )
}

const DRAG_HANDLE = "absolute top-0 right-0 w-[5px] h-full cursor-col-resize hover:bg-text-tertiary/40 active:bg-text-tertiary/60 transition-colors"

export function CompareResult() {
  const { requests, activeDimension, setDimension, getResults } = useCompareStore()
  const [colWidths, setColWidths] = useState<Record<string, number>>({})
  const dragRef = useRef<{ key: string; startX: number; startW: number } | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [])

  const getWidth = (key: string) =>
    colWidths[key] ?? (key === 'name' ? DEFAULT_NAME_COL : DEFAULT_VAL_COL)

  const onMouseDown = useCallback((key: string, e: React.MouseEvent) => {
    e.preventDefault()
    const startW = colWidths[key] ?? (key === 'name' ? DEFAULT_NAME_COL : DEFAULT_VAL_COL)
    dragRef.current = { key, startX: e.clientX, startW }

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = ev.clientX - dragRef.current.startX
      const next = Math.min(MAX_COL, Math.max(MIN_COL, dragRef.current.startW + delta))
      setColWidths(prev => ({ ...prev, [dragRef.current!.key]: next }))
    }

    const onMouseUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      cleanupRef.current = null
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    cleanupRef.current = onMouseUp
  }, [colWidths])

  const currentResults = getResults()

  if (requests.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <DimensionTabs activeDimension={activeDimension} setDimension={setDimension} />
        <div className="flex-1 flex items-center justify-center text-[12px] text-text-secondary">
          <div className="text-center">
            <p>暂无对比数据</p>
            <p className="text-[10px] text-text-tertiary mt-1">请先添加请求到对比面板</p>
          </div>
        </div>
      </div>
    )
  }

  const emptyHint = (activeDimension === 'responseHeaders' || activeDimension === 'responseBody')
    ? '暂无响应数据，请从历史记录导入已执行的请求'
    : '暂无数据'

  const nameW = getWidth('name')

  return (
    <div className="flex flex-col h-full">
      <DimensionTabs activeDimension={activeDimension} setDimension={setDimension} />

      <div className="flex-1 overflow-auto">
        {currentResults.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[12px] text-text-secondary">
            {emptyHint}
          </div>
        ) : (
          <div style={{ minWidth: 'max-content' }}>
            <div className="sticky top-0 bg-bg-tertiary/40 z-10">
              <div className="flex items-center text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
                <div className="relative shrink-0 px-3 py-2" style={{ width: nameW }}>
                  参数名
                  <div onMouseDown={(e) => onMouseDown('name', e)} className={DRAG_HANDLE} />
                </div>
                {requests.map((_, i) => {
                  const key = `val-${i}`
                  return (
                    <div key={i} className="relative shrink-0 px-3 py-2" style={{ width: getWidth(key) }}>
                      请求#{i + 1}
                      <div onMouseDown={(e) => onMouseDown(key, e)} className={DRAG_HANDLE} />
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="selectable-content">
              {currentResults.map((param) => {
                const firstValue = param.values[0]
                const allSame = param.values.every((v) => v === firstValue)
                const style = allSame ? SAME_STYLE : DIFF_STYLE

                return (
                  <div
                    key={param.name}
                    className="flex items-center text-[11px]"
                    style={{
                      borderLeftWidth: '3px',
                      borderLeftColor: style.border,
                      backgroundColor: style.bg,
                    }}
                  >
                    <div
                      className="shrink-0 px-3 py-2.5 font-mono text-text-primary font-medium overflow-hidden"
                      style={{ width: nameW }}
                    >
                      <div className="truncate" title={param.name}>{param.name}</div>
                    </div>

                    {param.values.map((value, i) => {
                      const isDifferent = value !== firstValue
                      return (
                        <div
                          key={i}
                          className="shrink-0 px-3 py-2.5 font-mono text-text-secondary overflow-hidden"
                          style={{ width: getWidth(`val-${i}`) }}
                        >
                          <div
                            className={`truncate ${isDifferent ? 'bg-error/15 text-error px-1 rounded' : ''}`}
                            title={value}
                          >
                            {value}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}