# TLS Probe - Advanced HTTP Client with TLS Fingerprinting

A powerful desktop HTTP client built with Wails (Go + React) that allows you to customize TLS fingerprints and HTTP/2 settings for testing and analysis.

## Features

### 🔐 TLS Fingerprinting
- **Browser Presets**: Chrome, Firefox, Safari, Edge, iOS, Android
- **Custom Configuration**: Fine-tune TLS parameters (cipher suites, extensions, ALPN)
- **Fingerprint Analysis**: View JA3, JA4, and Akamai HTTP/2 fingerprints
- **Template System**: Save and reuse custom TLS configurations

### 🚀 HTTP Client
- **Multiple Tabs**: Work with multiple requests simultaneously
- **Request Builder**: Intuitive UI for params, headers, body, auth
- **Response Viewer**: Formatted JSON, XML, HTML, and raw views
- **Timing Analysis**: Detailed breakdown (DNS, TCP, TLS, TTFB, download)
- **Redirect Tracking**: View complete redirect chains
- **cURL Import**: Paste cURL commands to create requests

### 🔄 Request Comparison
- **Side-by-Side**: Compare responses from different TLS configurations
- **Diff Viewer**: Highlight differences in status, headers, body
- **Batch Testing**: Test multiple configurations at once

### 📦 Organization
- **Collections**: Group related requests into folders
- **History**: Automatic tracking of all sent requests
- **Templates**: Reusable TLS and request configurations

### 🎨 Modern UI
- **Dark Theme**: Easy on the eyes
- **Keyboard Shortcuts**: Efficient workflow
- **Responsive Layout**: Resizable panels
- **Accessibility**: WCAG 2.1 Level AA compliant

## Tech Stack

### Frontend
- **React 19.2.0** - UI framework
- **TypeScript 5.7.3** - Type safety
- **Vite 6.0.11** - Build tool
- **Zustand 5.0.3** - State management
- **Radix UI** - Accessible components
- **Tailwind CSS 4.1.18** - Styling

### Backend (Go)
- **Wails v2** - Desktop framework
- **utls** - TLS fingerprinting
- **HTTP/2** - Custom SETTINGS frames
- **Proxy Support** - HTTP/SOCKS5

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/          # App shell, sidebar, status bar
│   │   ├── request/         # URL bar, params, headers, body
│   │   ├── response/        # Response viewer, tabs
│   │   ├── tls/             # TLS configuration panel
│   │   ├── compare/         # Request comparison
│   │   ├── codec/           # Encoding/decoding tools
│   │   ├── history/         # Request history
│   │   └── shared/          # Reusable components
│   ├── stores/              # Zustand state management
│   │   ├── request-store.ts # Request tabs and operations
│   │   ├── tls-store.ts     # TLS configuration
│   │   ├── collection-store.ts # Collections
│   │   ├── history-store.ts # Request history
│   │   └── ui-store.ts      # UI state
│   ├── types/               # TypeScript definitions
│   │   ├── request.ts       # HTTP request/response types
│   │   ├── tls.ts           # TLS configuration types
│   │   └── compare.ts       # Comparison types
│   └── utils/               # Utility functions
│       ├── wails-bridge.ts  # Frontend-backend bridge
│       ├── curl-parser.ts   # cURL command parser
│       └── helpers.ts       # Common utilities
├── public/                  # Static assets
├── index.html              # Entry HTML
├── package.json            # Dependencies
├── vite.config.ts          # Vite configuration
└── tailwind.config.js      # Tailwind configuration
```

## Development

### Prerequisites
- Node.js 18+ and pnpm
- Go 1.21+ (for Wails backend)
- Wails CLI v2.10+

### Install Dependencies
```bash
cd frontend
pnpm install
```

### Browser Dev Mode
Run frontend only (with mock backend):
```bash
pnpm dev
```
Open http://localhost:5173

### Wails Dev Mode
Run full desktop app with Go backend:
```bash
cd ..  # Go to project root
wails dev
```

### Build for Production
```bash
cd ..  # Go to project root
wails build
```

## Usage Examples

### Basic Request
1. Enter URL in the URL bar
2. Select HTTP method (GET, POST, etc.)
3. Add headers, params, or body as needed
4. Click "Send" or press Ctrl+Enter

### Custom TLS Fingerprint
1. Go to "TLS 指纹" tab
2. Select a browser preset (e.g., Chrome 131)
3. Or enable "Custom" and configure manually
4. Send request to see TLS info in response

### Request Comparison
1. Click "Compare" in sidebar
2. Add 2+ requests (paste cURL or configure manually)
3. Select different TLS presets for each
4. Click "Compare All" to see differences

### Save as Template
1. Configure TLS settings
2. Click "Save Template" button
3. Name your template
4. Reuse from templates dropdown

## Configuration

### TLS Presets
Located in `/Users/kang/Claude-works/jiemian/frontend/src/types/tls.ts`

Each preset includes:
- **JA3**: TLS ClientHello fingerprint
- **JA4**: Enhanced fingerprint (newer standard)
- **Akamai**: HTTP/2 SETTINGS frame fingerprint

### Keyboard Shortcuts
- `Ctrl+Enter` - Send request
- `Ctrl+T` - New tab
- `Ctrl+W` - Close tab
- `Ctrl+Tab` - Next tab
- `Ctrl+Shift+Tab` - Previous tab

## Architecture

### State Management
Uses Zustand with Immer middleware for immutable updates:
```typescript
// Example: Adding a header
addHeader: () => {
  set((state) => {
    const tab = state.tabs.find(t => t.request.id === state.activeTabId)
    if (tab) {
      tab.request.headers.push(emptyKv())
    }
  })
}
```

### Frontend-Backend Bridge
All Go backend calls go through `/Users/kang/Claude-works/jiemian/frontend/src/utils/wails-bridge.ts`:
```typescript
// Send request with TLS config
const response = await sendRequest(requestConfig, tlsConfig)

// Save templates
await saveTlsTemplates(templates)
```

### Component Patterns
- **Immutability**: Always create new objects, never mutate
- **Performance**: useMemo/useCallback for expensive operations
- **Accessibility**: ARIA labels, keyboard navigation
- **Error Handling**: Try-catch with user-friendly messages

## Testing

### Run Tests
```bash
pnpm test
```

### Coverage
```bash
pnpm test:coverage
```

Target: 80%+ coverage

## Contributing

### Code Style
- Use TypeScript strict mode
- Follow immutability principles
- Add JSDoc comments for complex functions
- Keep files under 800 lines
- Use meaningful variable names

### Commit Messages
```
feat: add HTTP/2 priority frames support
fix: resolve window dragging issue
docs: update TLS configuration guide
```

## License

MIT

## Support

For issues and feature requests, please open an issue on GitHub.
