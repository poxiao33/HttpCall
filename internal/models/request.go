package models

// HttpMethod represents HTTP request methods
type HttpMethod string

const (
	GET     HttpMethod = "GET"
	POST    HttpMethod = "POST"
	PUT     HttpMethod = "PUT"
	PATCH   HttpMethod = "PATCH"
	DELETE  HttpMethod = "DELETE"
	HEAD    HttpMethod = "HEAD"
	OPTIONS HttpMethod = "OPTIONS"
)

// KeyValuePair represents a key-value pair with enable/disable state
type KeyValuePair struct {
	ID      string `json:"id"`
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
	Note    string `json:"note,omitempty"`
}

// FormDataPair extends KeyValuePair for form data with file support
type FormDataPair struct {
	KeyValuePair
	Type     string `json:"type,omitempty"`     // "text" or "file"
	FilePath string `json:"filePath,omitempty"` // Path to file for file type
}

// BasicAuth represents basic authentication credentials
type BasicAuth struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// ApiKeyAuth represents API key authentication
type ApiKeyAuth struct {
	Key   string `json:"key"`
	Value string `json:"value"`
	AddTo string `json:"addTo"` // "header" or "query"
}

// AuthConfig represents authentication configuration
type AuthConfig struct {
	Type   string      `json:"type"` // "none", "bearer", "basic", "apikey"
	Bearer string      `json:"bearer,omitempty"`
	Basic  *BasicAuth  `json:"basic,omitempty"`
	ApiKey *ApiKeyAuth `json:"apikey,omitempty"`
}

// ProxyAuth represents proxy authentication credentials
type ProxyAuth struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// ProxyConfig represents proxy configuration
type ProxyConfig struct {
	Type string     `json:"type"` // "none", "http" or "socks5"
	Host string     `json:"host"`
	Port int        `json:"port"`
	Auth *ProxyAuth `json:"auth,omitempty"`
}

// RequestConfig represents the complete HTTP request configuration
type RequestConfig struct {
	ID              string          `json:"id"`
	Name            string          `json:"name"`
	Method          HttpMethod      `json:"method"`
	URL             string          `json:"url"`
	Params          []KeyValuePair  `json:"params"`
	Headers         []KeyValuePair  `json:"headers"`
	Cookies         []KeyValuePair  `json:"cookies"`
	Body            string          `json:"body"`
	BodyType        string          `json:"bodyType"` // "none", "json", "form", "urlencoded", "raw", "binary"
	FormData        []FormDataPair  `json:"formData"`
	Auth            AuthConfig      `json:"auth"`
	Proxy           *ProxyConfig    `json:"proxy,omitempty"`
	FollowRedirects bool            `json:"followRedirects"`
	MaxRedirects    int             `json:"maxRedirects"`
	Note            string          `json:"note,omitempty"`
}

// TimingData represents request timing information in milliseconds
type TimingData struct {
	DNS      int64 `json:"dns"`
	TCP      int64 `json:"tcp"`
	TLS      int64 `json:"tls"`
	TTFB     int64 `json:"ttfb"`
	Download int64 `json:"download"`
	Total    int64 `json:"total"`
}

// TlsHandshakeInfo represents TLS handshake information
type TlsHandshakeInfo struct {
	Version     string `json:"version"`
	CipherSuite string `json:"cipherSuite"`
	ServerCert  string `json:"serverCert,omitempty"`
	ALPN        string `json:"alpn,omitempty"`
	JA3Hash     string `json:"ja3Hash,omitempty"`
	JA4Hash     string `json:"ja4Hash,omitempty"`
}

// RedirectHop represents a single redirect in the chain
type RedirectHop struct {
	URL        string            `json:"url"`
	Status     int               `json:"status"`
	StatusText string            `json:"statusText"`
	Headers    map[string]string `json:"headers"`
}

// ConnEvent represents a single connection-level event (TLS record, etc.)
type ConnEvent struct {
	Time       float64 `json:"time"`                 // ms since connection start
	Direction  string  `json:"direction"`             // "send" / "recv"
	Size       int     `json:"size"`                  // bytes
	Summary    string  `json:"summary"`               // e.g. "TLS ClientHello"
	Detail     string  `json:"detail,omitempty"`      // detailed parameters
	HexPreview string  `json:"hexPreview,omitempty"` // full hex encoded data
}

// ConnTrace represents the full connection trace
type ConnTrace struct {
	Events     []ConnEvent `json:"events"`
	TargetAddr string      `json:"targetAddr,omitempty"`
	RemoteAddr string      `json:"remoteAddr,omitempty"`
	LocalAddr  string      `json:"localAddr,omitempty"`
}

// ResponseData represents the HTTP response data
type ResponseData struct {
	Status          int               `json:"status"`
	StatusText      string            `json:"statusText"`
	Headers         map[string]string `json:"headers"`
	Body            string            `json:"body"`
	Size            int               `json:"size"`
	IsBase64        bool              `json:"isBase64"`
	ContentEncoding string            `json:"contentEncoding,omitempty"`
	Timing          TimingData        `json:"timing"`
	TlsInfo         *TlsHandshakeInfo `json:"tlsInfo,omitempty"`
	Redirects       []RedirectHop     `json:"redirects,omitempty"`
	ConnTrace       *ConnTrace        `json:"connTrace,omitempty"`
}
