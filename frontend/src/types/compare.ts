export interface CompareParam {
  name: string
  values: string[]
}

export interface CompareRequest {
  id: string
  method: string
  url: string
  params: Record<string, string>
  headers: Record<string, string>
  cookies: Record<string, string>
  body: string
  response?: {
    status: number
    statusText: string
    headers: Record<string, string>
    body: string
  }
}

export interface CompareResult {
  dimension: string
  params: CompareParam[]
}
