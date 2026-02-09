# API Documentation

## Wails Bridge API

The Wails bridge provides communication between the React frontend and Go backend.

### sendRequest

Sends an HTTP request with custom TLS fingerprint configuration.

```typescript
async function sendRequest(
  request: RequestConfig,
  tlsConfig: TlsConfig
): Promise<ResponseData>
```

**Parameters:**
- `request`: HTTP request configuration
  - `method`: HTTP method (GET, POST, PUT, DELETE, etc.)
  - `url`: Target URL
  - `headers`: Array of key-value pairs
  - `body`: Request body (for POST/PUT)
  - `auth`: Authentication configuration
  - `followRedirects`: Whether to follow redirects
  - `maxRedirects`: Maximum redirect hops
  - `proxy`: Optional proxy configuration

- `tlsConfig`: TLS fingerprint configuration
  - `preset`: Preset ID ('chrome_131', 'firefox_133', etc.) or 'custom'
  - `customEnabled`: Whether to use custom TLS parameters
  - `tlsVersion`: TLS version ('tls12', 'tls13', 'auto')
  - `cipherSuites`: Ordered list of cipher suites
  - `extensions`: Ordered list of TLS extensions
  - `alpnProtocols`: ALPN protocols (e.g., ['h2', 'http/1.1'])
  - `http2`: HTTP/2 SETTINGS configuration

**Returns:**
- `ResponseData` object containing:
  - `status`: HTTP status code
  - `statusText`: HTTP status text
  - `headers`: Response headers
  - `body`: Response body
  - `size`: Response size in bytes
  - `timing`: Detailed timing breakdown
    - `dns`: DNS lookup time (ms)
    - `tcp`: TCP connection time (ms)
    - `tls`: TLS handshake time (ms)
    - `ttfb`: Time to first byte (ms)
    - `download`: Download time (ms)
    - `total`: Total time (ms)
  - `tlsInfo`: TLS connection information
    - `version`: TLS version used
    - `cipherSuite`: Negotiated cipher suite
    - `alpn`: Negotiated ALPN protocol
    - `ja3Hash`: JA3 fingerprint hash
  - `redirects`: Array of redirect hops

**Example:**
```typescript
const response = await sendRequest(
  {
    method: 'GET',
    url: 'https://tls.peet.ws/api/all',
    headers: [
      { id: '1', key: 'User-Agent', value: 'Mozilla/5.0', enabled: true }
    ],
    params: [],
    cookies: [],
    body: '',
    bodyType: 'none',
    auth: { type: 'none' },
    followRedirects: true,
    maxRedirects: 5
  },
  {
    preset: 'chrome_131',
    customEnabled: false,
    tlsVersion: 'auto',
    cipherSuites: [],
    extensions: [],
    alpnProtocols: ['h2', 'http/1.1'],
    signatureAlgorithms: [],
    http2: {
      headerTableSize: 65536,
      enablePush: false,
      maxConcurrentStreams: 1000,
      initialWindowSize: 6291456,
      maxFrameSize: 16384,
      maxHeaderListSize: 262144,
      windowUpdateIncrement: 15663105,
      headerOrder: [':method', ':authority', ':scheme', ':path'],
      priorityFrames: false
    }
  }
)

console.log(response.status) // 200
console.log(response.timing.total) // 184
console.log(response.tlsInfo.ja3Hash) // 'cd08e31494f9531f560d64c695473da9'
```

### Storage APIs

#### saveTlsTemplates / loadTlsTemplates

```typescript
async function saveTlsTemplates(templates: TlsTemplate[]): Promise<void>
async function loadTlsTemplates(): Promise<TlsTemplate[]>
```

Save and load TLS configuration templates.

**Example:**
```typescript
// Save templates
await saveTlsTemplates([
  {
    id: 'my-template-1',
    name: 'Custom Chrome',
    config: { /* TLS config */ },
    createdAt: new Date().toISOString()
  }
])

// Load templates
const templates = await loadTlsTemplates()
```

#### saveCollections / loadCollections

```typescript
async function saveCollections(collections: Collection[]): Promise<void>
async function loadCollections(): Promise<Collection[]>
```

Save and load request collections (folders).

**Example:**
```typescript
// Save collections
await saveCollections([
  {
    id: 'col-1',
    name: 'API Tests',
    requests: [/* request configs */],
    createdAt: new Date().toISOString()
  }
])

// Load collections
const collections = await loadCollections()
```

#### saveHistory / loadHistory

```typescript
async function saveHistory(entries: HistoryEntry[]): Promise<void>
async function loadHistory(): Promise<HistoryEntry[]>
```

Save and load request history.

**Example:**
```typescript
// Save history
await saveHistory([
  {
    id: 'hist-1',
    method: 'GET',
    url: 'https://api.example.com',
    timestamp: Date.now(),
    status: 200,
    duration: 184,
    params: [],
    headers: [],
    body: '',
    response: { /* response data */ }
  }
])

// Load history
const history = await loadHistory()
```

## Store APIs

### useRequestStore

Main store for managing HTTP requests and tabs.

```typescript
const store = useRequestStore()
```

**State:**
- `tabs: TabState[]` - Array of open request tabs
- `activeTabId: string` - ID of currently active tab
- `activePanel: string` - Active panel ('params', 'headers', 'body', etc.)
- `responseTab: string` - Active response tab ('body', 'headers', 'timing', etc.)

**Actions:**

#### Tab Management
```typescript
// Add new tab
store.addTab()
store.addTab({ method: 'POST', url: 'https://api.example.com' })

// Remove tab
store.removeTab(tabId)

// Switch to tab
store.switchTab(tabId)

// Duplicate tab
store.duplicateTab(tabId)

// Rename tab
store.renameTab(tabId, 'New Name')

// Load from history
store.loadFromHistory(historyEntry)
```

#### Request Configuration
```typescript
// Set HTTP method
store.setMethod('POST')

// Set URL
store.setUrl('https://api.example.com')

// Set body
store.setBody('{"key":"value"}')
store.setBodyType('raw') // 'none' | 'raw' | 'form-data'

// Set auth
store.setAuth({ type: 'bearer', token: 'abc123' })

// Update params/headers/cookies
store.updateParam(id, 'key', 'page')
store.updateParam(id, 'value', '1')
store.updateHeader(id, 'key', 'Content-Type')
store.updateHeader(id, 'value', 'application/json')

// Add/remove params/headers/cookies
store.addParam()
store.addHeader()
store.addCookie()
store.removeParam(id)
store.removeHeader(id)
store.removeCookie(id)

// Set proxy
store.setProxy({ type: 'http', host: 'proxy.example.com', port: 8080 })

// Set redirect options
store.setFollowRedirects(true)
store.setMaxRedirects(5)
```

#### Send Request
```typescript
// Send current tab's request
store.sendRequest()
```

### useTlsStore

Store for managing TLS fingerprint configuration.

```typescript
const store = useTlsStore()
```

**State:**
- `config: TlsConfig` - Current TLS configuration
- `templates: TlsTemplate[]` - Saved templates

**Actions:**
```typescript
// Set preset
store.setPreset('chrome_131')

// Enable custom configuration
store.setCustomEnabled(true)

// Set TLS version
store.setTlsVersion('tls13')

// Set cipher suites
store.setCipherSuites(['TLS_AES_128_GCM_SHA256', 'TLS_AES_256_GCM_SHA384'])

// Set extensions
store.setExtensions(['server_name (0)', 'supported_groups (10)'])

// Set ALPN protocols
store.setAlpnProtocols(['h2', 'http/1.1'])

// Update HTTP/2 settings
store.updateHttp2Setting('headerTableSize', 65536)
store.updateHttp2Setting('enablePush', false)

// Save/load templates
store.saveTemplate('My Template')
store.loadTemplate(templateId)
store.deleteTemplate(templateId)
```

### useCollectionStore

Store for managing request collections.

```typescript
const store = useCollectionStore()
```

**Actions:**
```typescript
// Add collection
store.addCollection('API Tests')

// Add request to collection
store.addRequest(collectionId, requestConfig)

// Remove collection
store.removeCollection(collectionId)

// Remove request from collection
store.removeRequest(collectionId, requestId)

// Rename collection
store.renameCollection(collectionId, 'New Name')
```

### useHistoryStore

Store for managing request history.

```typescript
const store = useHistoryStore()
```

**State:**
- `entries: HistoryEntry[]` - Array of history entries

**Actions:**
```typescript
// Add to history
store.addEntry({
  method: 'GET',
  url: 'https://api.example.com',
  status: 200,
  duration: 184,
  params: [],
  headers: [],
  body: '',
  response: responseData
})

// Clear history
store.clearHistory()

// Remove entry
store.removeEntry(entryId)
```

## Utility Functions

### parseCurl

Parses cURL command strings into request objects.

```typescript
function parseCurl(curlCommand: string): CompareRequest | null
```

**Example:**
```typescript
const request = parseCurl(`
  curl -X POST 'https://api.example.com/users' \\
    -H 'Content-Type: application/json' \\
    -H 'Authorization: Bearer token123' \\
    -d '{"name":"John","email":"john@example.com"}'
`)

// Returns:
// {
//   id: 'generated-id',
//   method: 'POST',
//   url: 'https://api.example.com/users',
//   headers: {
//     'Content-Type': 'application/json',
//     'Authorization': 'Bearer token123'
//   },
//   body: '{"name":"John","email":"john@example.com"}',
//   params: {},
//   cookies: {}
// }
```

### parseMultipleCurls

Parses multiple cURL commands separated by blank lines.

```typescript
function parseMultipleCurls(text: string): CompareRequest[]
```

**Example:**
```typescript
const requests = parseMultipleCurls(`
  curl https://api.example.com/users

  curl -X POST https://api.example.com/users -d '{"name":"John"}'

  curl -X DELETE https://api.example.com/users/1
`)

// Returns array with 3 requests
```

## Type Definitions

### RequestConfig

```typescript
interface RequestConfig {
  id: string
  name: string
  method: HttpMethod
  url: string
  params: KeyValuePair[]
  headers: KeyValuePair[]
  cookies: KeyValuePair[]
  body: string
  bodyType: 'none' | 'raw' | 'form-data'
  formData: FormDataPair[]
  auth: AuthConfig
  followRedirects: boolean
  maxRedirects: number
  proxy?: ProxyConfig
}
```

### TlsConfig

```typescript
interface TlsConfig {
  preset: string
  customEnabled: boolean
  tlsVersion: 'tls12' | 'tls13' | 'auto'
  cipherSuites: string[]
  extensions: string[]
  alpnProtocols: string[]
  signatureAlgorithms: string[]
  http2: Http2Config
}
```

### ResponseData

```typescript
interface ResponseData {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  size: number
  timing: TimingData
  tlsInfo?: TlsInfo
  redirects: RedirectHop[]
}
```

### TimingData

```typescript
interface TimingData {
  dns: number      // DNS lookup time (ms)
  tcp: number      // TCP connection time (ms)
  tls: number      // TLS handshake time (ms)
  ttfb: number     // Time to first byte (ms)
  download: number // Download time (ms)
  total: number    // Total time (ms)
}
```

### TlsInfo

```typescript
interface TlsInfo {
  version: string       // e.g., 'TLS 1.3'
  cipherSuite: string   // e.g., 'TLS_AES_128_GCM_SHA256'
  alpn: string          // e.g., 'h2'
  ja3Hash: string       // JA3 fingerprint hash
}
```
