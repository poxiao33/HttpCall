import type { HttpMethod } from '../../types/request'

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-method-get',
  POST: 'text-method-post',
  PUT: 'text-method-put',
  PATCH: 'text-method-patch',
  DELETE: 'text-method-delete',
  HEAD: 'text-method-head',
  OPTIONS: 'text-method-options',
}

export function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span className={`font-mono text-[11px] font-semibold ${METHOD_COLORS[method]}`}>
      {method}
    </span>
  )
}

export function StatusBadge({ status }: { status: number }) {
  const color = status < 300 ? 'text-success' : status < 400 ? 'text-info' : status < 500 ? 'text-warning' : 'text-error'
  return (
    <span className={`font-mono text-[11px] font-medium ${color}`}>
      {status}
    </span>
  )
}
