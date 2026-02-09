# TLS Probe Usage Guide

## Getting Started

### First Launch

When you first launch TLS Probe, you'll see:
- A single empty request tab
- The URL bar at the top
- Request configuration panels (Params, Headers, Body, etc.)
- An empty response area

### Making Your First Request

1. **Enter a URL** in the URL bar (e.g., `https://httpbin.org/get`)
2. **Select HTTP method** from the dropdown (GET, POST, PUT, DELETE, etc.)
3. **Click "Send"** or press `Ctrl+Enter`
4. **View the response** in the response panel below

## Working with Requests

### URL Bar

The URL bar supports:
- **Full URLs**: `https://api.example.com/users?page=1`
- **Query parameters**: Automatically parsed and shown in Params tab
- **Validation**: Shows error if URL is invalid

### Request Tabs

#### Params Tab
Add query parameters that will be appended to the URL:
- Click "+ Add" to add a new parameter
- Toggle the checkbox to enable/disable
- Parameters are automatically URL-encoded

**Example:**
```
Key: page    Value: 1
Key: limit   Value: 10
```
Results in: `?page=1&limit=10`

#### Headers Tab
Add custom HTTP headers:
- Common headers are auto-suggested
- Default User-Agent is included
- Toggle to enable/disable headers

**Example:**
```
Key: Content-Type    Value: application/json
Key: Authorization   Value: Bearer token123
```

#### Body Tab
Configure request body (for POST/PUT/PATCH):
- **None**: No body
- **Raw**: Plain text, JSON, XML, etc.
- **Form Data**: Multipart form data with file uploads

**JSON Example:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30
}
```

#### Options Tab
Configure request behavior:
- **Follow Redirects**: Automatically follow 3xx redirects
- **Max Redirects**: Maximum number of redirect hops (default: 5)
- **Timeout**: Request timeout in seconds
- **Proxy**: HTTP/SOCKS5 proxy configuration

#### TLS 指纹 Tab
Configure TLS fingerprint (see TLS Fingerprinting section)

#### cURL 导入 Tab
Import requests from cURL commands:
1. Paste cURL command
2. Click "Parse"
3. Request is automatically configured

**Example:**
```bash
curl -X POST 'https://api.example.com/users' \
  -H 'Content-Type: application/json' \
  -d '{"name":"John"}'
```

### Multiple Tabs

Work with multiple requests simultaneously:
- **New Tab**: Click "+" button or `Ctrl+T`
- **Close Tab**: Click "×" on tab or `Ctrl+W`
- **Switch Tabs**: Click tab or `Ctrl+Tab` / `Ctrl+Shift+Tab`
- **Duplicate Tab**: Right-click tab → Duplicate
- **Rename Tab**: Double-click tab name

## TLS Fingerprinting

### What is TLS Fingerprinting?

TLS fingerprinting identifies clients based on their TLS handshake parameters:
- **JA3**: Hash of TLS ClientHello parameters
- **JA4**: Enhanced fingerprinting method
- **Akamai**: HTTP/2 SETTINGS frame fingerprint

Different browsers have unique fingerprints that can be detected by servers.

### Using Browser Presets

1. Go to **TLS 指纹** tab
2. Select a preset from the dropdown:
   - **Chrome 131**: Windows/macOS Chrome
   - **Firefox 133**: Windows/macOS Firefox
   - **Safari 18**: macOS/iOS Safari
   - **Edge 131**: Windows Edge
   - **iOS 18**: iPhone/iPad
   - **Android 14**: Android OkHttp
3. Send request
4. View TLS info in response (TLS Info tab)

### Custom TLS Configuration

For advanced users who need precise control:

1. Select **Custom** preset
2. Enable **Custom Configuration**
3. Configure parameters:

#### TLS Version
- **TLS 1.2**: Older but widely supported
- **TLS 1.3**: Modern, faster, more secure
- **Auto**: Let server choose

#### Cipher Suites
Order matters! Servers typically choose the first supported cipher:
```
TLS_AES_128_GCM_SHA256
TLS_AES_256_GCM_SHA384
TLS_CHACHA20_POLY1305_SHA256
```

#### TLS Extensions
Extensions advertised in ClientHello:
```
server_name (0)
supported_groups (10)
ec_point_formats (11)
application_layer_protocol_negotiation (16)
```

#### ALPN Protocols
Application-Layer Protocol Negotiation:
```
h2          (HTTP/2)
http/1.1    (HTTP/1.1)
```

#### HTTP/2 Settings
Fine-tune HTTP/2 SETTINGS frame:
- **Header Table Size**: HPACK compression table size
- **Enable Push**: Allow server push
- **Max Concurrent Streams**: Maximum parallel streams
- **Initial Window Size**: Flow control window
- **Max Frame Size**: Maximum frame payload
- **Max Header List Size**: Maximum header size

### Saving TLS Templates

Save custom configurations for reuse:

1. Configure TLS settings
2. Click **Save Template**
3. Enter template name
4. Template appears in dropdown

Load saved templates:
1. Click **Templates** dropdown
2. Select template
3. Configuration is applied

## Response Viewer

### Response Tabs

#### Body Tab
View response body with automatic formatting:
- **JSON**: Syntax highlighted, collapsible
- **XML**: Formatted and highlighted
- **HTML**: Rendered or source view
- **Raw**: Plain text

**Search**: Use `Ctrl+F` to search in response body

#### Headers Tab
View all response headers:
```
content-type: application/json; charset=utf-8
server: nginx/1.24.0
cache-control: no-cache
```

#### Timing Tab
Detailed timing breakdown:
```
DNS Lookup:     12 ms
TCP Connect:    23 ms
TLS Handshake:  45 ms
TTFB:          89 ms
Download:      15 ms
─────────────────────
Total:        184 ms
```

**Waterfall Chart**: Visual representation of timing phases

#### TLS Info Tab
TLS connection details:
```
Version:      TLS 1.3
Cipher Suite: TLS_AES_128_GCM_SHA256
ALPN:         h2
JA3 Hash:     cd08e31494f9531f560d64c695473da9
```

#### Redirects Tab
View redirect chain (if any):
```
1. https://example.com → 301 Moved Permanently
2. https://www.example.com → 200 OK
```

## Request Comparison

Compare responses from different TLS configurations:

### Setup

1. Click **Compare** in sidebar
2. Add requests:
   - **Paste cURL**: Import from cURL command
   - **Manual**: Configure request manually
3. Configure TLS for each request
4. Click **Compare All**

### Viewing Results

Side-by-side comparison shows:
- **Status codes**: Highlight differences
- **Headers**: Show added/removed/changed headers
- **Body**: Diff view with line-by-line comparison
- **Timing**: Compare performance

**Use Case**: Test if different TLS fingerprints affect server responses

## Collections

Organize requests into folders:

### Creating Collections

1. Click **Collections** in sidebar
2. Click **+ New Collection**
3. Enter collection name
4. Add requests to collection

### Managing Collections

- **Add Request**: Drag request tab to collection
- **Remove Request**: Right-click → Remove
- **Rename Collection**: Double-click name
- **Delete Collection**: Right-click → Delete

**Example Structure:**
```
📁 API Tests
  ├── GET /users
  ├── POST /users
  └── DELETE /users/1
📁 TLS Tests
  ├── Chrome Fingerprint
  ├── Firefox Fingerprint
  └── Custom Fingerprint
```

## History

Automatic tracking of all sent requests:

### Viewing History

1. Click **History** in sidebar
2. Browse chronological list
3. Click entry to load into new tab

### History Details

Each entry shows:
- **Method and URL**
- **Status code**
- **Duration**
- **Timestamp**

### Managing History

- **Search**: Filter by URL or method
- **Clear**: Remove all history
- **Delete Entry**: Right-click → Delete

## Codec Tools

Encode/decode data:

### Base64
```
Input:  Hello World
Output: SGVsbG8gV29ybGQ=
```

### URL Encoding
```
Input:  hello world
Output: hello%20world
```

### JWT Decoder
```
Input:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Output: {
  "header": { "alg": "HS256", "typ": "JWT" },
  "payload": { "sub": "1234567890", "name": "John" }
}
```

### Hash Functions
- MD5
- SHA-1
- SHA-256
- SHA-512

## Keyboard Shortcuts

### Global
- `Ctrl+Enter` - Send request
- `Ctrl+T` - New tab
- `Ctrl+W` - Close tab
- `Ctrl+Tab` - Next tab
- `Ctrl+Shift+Tab` - Previous tab
- `Ctrl+F` - Search in response
- `Ctrl+,` - Settings

### Request Editor
- `Tab` - Next field
- `Shift+Tab` - Previous field
- `Ctrl+Space` - Auto-complete (headers)

## Tips & Tricks

### Quick Testing

Test an API endpoint quickly:
1. Paste URL
2. Press `Ctrl+Enter`
3. View response

### Debugging TLS Issues

If a server rejects your request:
1. Try different browser presets
2. Check TLS Info tab for negotiated parameters
3. Compare with real browser using tls.peet.ws

### Performance Testing

Compare performance across TLS versions:
1. Create 3 requests with same URL
2. Set TLS 1.2, TLS 1.3, Auto
3. Use Compare feature
4. Check Timing tab

### Batch Import

Import multiple requests from documentation:
1. Copy all cURL commands
2. Go to cURL 导入 tab
3. Paste (separated by blank lines)
4. All requests are imported

### Template Workflow

Create templates for common scenarios:
1. **Production API**: Real browser fingerprint
2. **Testing**: Custom fingerprint for debugging
3. **Legacy**: TLS 1.2 for old servers

## Troubleshooting

### Request Fails

**Problem**: Request returns error or times out

**Solutions**:
- Check URL is valid and accessible
- Verify network connection
- Try disabling proxy
- Increase timeout in Options tab

### TLS Handshake Fails

**Problem**: TLS handshake error

**Solutions**:
- Try different TLS version (1.2 vs 1.3)
- Use browser preset instead of custom
- Check if server supports TLS 1.3
- Verify cipher suites are supported

### Response Not Formatted

**Problem**: JSON/XML not formatted in Body tab

**Solutions**:
- Check Content-Type header
- Verify response is valid JSON/XML
- Use Raw view to see original

### Window Won't Drag

**Problem**: Can't drag window from top bar

**Solutions**:
- Drag from empty space between tabs
- Don't drag from tab buttons
- Don't drag from window control buttons

## Advanced Usage

### Proxy Configuration

Route requests through proxy:

**HTTP Proxy:**
```
Type: HTTP
Host: proxy.example.com
Port: 8080
Username: (optional)
Password: (optional)
```

**SOCKS5 Proxy:**
```
Type: SOCKS5
Host: socks.example.com
Port: 1080
```

### Authentication

#### Bearer Token
```
Type: Bearer
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Basic Auth
```
Type: Basic
Username: john
Password: secret123
```

#### API Key
```
Type: API Key
Key: X-API-Key
Value: abc123xyz
```

### Custom Headers

Common custom headers:
```
X-Request-ID: unique-id-123
X-Correlation-ID: trace-456
X-Forwarded-For: 1.2.3.4
X-Real-IP: 1.2.3.4
```

### Form Data with Files

Upload files in form data:
1. Set Body Type to "Form Data"
2. Add field
3. Select "File" type
4. Choose file
5. Send request

## Best Practices

### Security

- **Never commit secrets**: Don't save API keys in collections
- **Use environment variables**: For sensitive data
- **Rotate tokens**: Regularly update auth tokens

### Organization

- **Use collections**: Group related requests
- **Name requests clearly**: "GET Users List", not "Request 1"
- **Save templates**: For common TLS configs

### Testing

- **Test with real browsers**: Verify fingerprints match
- **Use tls.peet.ws**: Validate TLS fingerprints
- **Compare responses**: Check if fingerprint affects response

### Performance

- **Close unused tabs**: Reduce memory usage
- **Clear history**: Periodically clean old entries
- **Disable redirects**: When not needed

## Getting Help

### Resources

- **README.md**: Project overview and setup
- **API.md**: Complete API documentation
- **GitHub Issues**: Report bugs and request features

### Common Questions

**Q: Why does my fingerprint not match the browser?**
A: Ensure all TLS parameters match exactly (cipher order, extensions, HTTP/2 settings)

**Q: Can I export/import collections?**
A: Yes, collections are stored as JSON files in the app data directory

**Q: Does this work with HTTP/3 (QUIC)?**
A: Not yet, currently supports HTTP/1.1 and HTTP/2 over TLS

**Q: Can I use this for load testing?**
A: No, this is designed for manual testing and analysis, not load testing
