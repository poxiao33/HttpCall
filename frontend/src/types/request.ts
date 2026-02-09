export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export interface KeyValuePair {
  id: string
  key: string
  value: string
  enabled: boolean
  note?: string
}

export interface FormDataPair extends KeyValuePair {
  type?: 'text' | 'file'
  file?: File
}

export interface RequestConfig {
  id: string
  name: string
  method: HttpMethod
  url: string
  params: KeyValuePair[]
  headers: KeyValuePair[]
  cookies: KeyValuePair[]
  body: string
  bodyType: 'none' | 'raw' | 'form'
  formData: FormDataPair[]
  auth: AuthConfig
  proxy?: ProxyConfig
  followRedirects: boolean
  maxRedirects: number
  note?: string
}

export interface TabState {
  request: RequestConfig
  response: ResponseData | null
  loading: boolean
}

export interface AuthConfig {
  type: 'none' | 'bearer' | 'basic' | 'apikey'
  bearer?: string
  basic?: { username: string; password: string }
  apikey?: { key: string; value: string; addTo: 'header' | 'query' }
}

export interface ProxyConfig {
  type: 'none' | 'http' | 'socks5'
  host: string
  port: number
  auth?: {
    username: string
    password: string
  }
}

export interface RedirectHop {
  url: string
  status: number
  statusText: string
  headers: Record<string, string>
}

export interface ResponseData {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  size: number
  isBase64: boolean
  contentEncoding?: string
  timing: TimingData
  tlsInfo?: TlsHandshakeInfo
  redirects?: RedirectHop[]
  connTrace?: ConnTrace
}

export interface TimingData {
  dns: number
  tcp: number
  tls: number
  ttfb: number
  download: number
  total: number
}

export interface TlsHandshakeInfo {
  version: string
  cipherSuite: string
  serverCert?: string
  alpn?: string
  ja3Hash?: string
}

export interface ConnEvent {
  time: number
  direction: 'send' | 'recv'
  size: number
  summary: string
  detail?: string
  hexPreview?: string
}

export interface ConnTrace {
  events: ConnEvent[]
  targetAddr?: string
  remoteAddr?: string
  localAddr?: string
}
