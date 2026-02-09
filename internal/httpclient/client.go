package httpclient

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"net/http/httptrace"
	"sync"
	"time"

	utls "github.com/refraction-networking/utls"
	"golang.org/x/net/http2"
	http2fp "jiemian/internal/http2"
	"jiemian/internal/models"
	"jiemian/internal/proxy"
	tlspkg "jiemian/internal/tls"
)

type Client struct {
	tlsConfig   *models.TlsConfig
	dialer      proxy.Dialer
	mu          sync.Mutex
	lastTLSInfo *models.TlsHandshakeInfo
	connLogs    []*loggedConn
	lastTarget  string
	timing      *timingTracker
}

func New(tlsConfig *models.TlsConfig, proxyConfig *models.ProxyConfig) (*Client, error) {
	d, err := proxy.NewDialer(proxyConfig)
	if err != nil {
		return nil, fmt.Errorf("proxy setup failed: %w", err)
	}
	return &Client{
		tlsConfig: tlsConfig,
		dialer:    d,
	}, nil
}

func (c *Client) Send(ctx context.Context, config *models.RequestConfig) (*models.ResponseData, error) {
	req, err := buildRequest(config)
	if err != nil {
		return nil, err
	}

	timing := newTimingTracker()
	timing.requestStart = time.Now()

	c.mu.Lock()
	c.timing = timing
	c.connLogs = nil
	c.lastTarget = ""
	c.lastTLSInfo = nil
	c.mu.Unlock()

	traceCtx := httptrace.WithClientTrace(ctx, timing.trace())
	req = req.WithContext(traceCtx)

	transport := c.buildTransport(config)
	defer closeTransport(transport)

	httpClient := &http.Client{
		Transport: transport,
		Timeout:   30 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	var hops []models.RedirectHop
	var resp *http.Response

	if config.FollowRedirects {
		hops, resp, err = followRedirects(httpClient, req, config.MaxRedirects)
		if err != nil && resp == nil {
			return nil, err
		}
	} else {
		resp, err = httpClient.Do(req)
		if err != nil {
			return nil, err
		}
	}

	result, err := parseResponse(resp)
	if err != nil {
		return nil, err
	}

	timing.bodyDone = time.Now()
	result.Timing = timing.result()
	result.Redirects = hops

	// Add TLS info from captured connection state
	c.mu.Lock()
	lastTLSInfo := c.lastTLSInfo
	connLogs := c.connLogs
	lastTarget := c.lastTarget
	c.mu.Unlock()

	if result.TlsInfo == nil && lastTLSInfo != nil {
		result.TlsInfo = lastTLSInfo
	}

	// Build connection trace from all logged conns (H2 fallback may produce multiple)
	if len(connLogs) > 0 {
		entries := mergeConnEntries(connLogs)
		events := parseTLSRecords(entries)
		last := connLogs[len(connLogs)-1]
		result.ConnTrace = &models.ConnTrace{
			Events:     events,
			TargetAddr: lastTarget,
			RemoteAddr: last.RemoteAddr().String(),
			LocalAddr:  last.LocalAddr().String(),
		}
	}

	return result, nil
}

func (c *Client) dialTLS(ctx context.Context, network, addr string) (net.Conn, error) {
	// DNS timing: resolve happens inside DialContext
	dnsStart := time.Now()
	tcpConn, err := c.dialer.DialContext(ctx, network, addr)
	if err != nil {
		return nil, err
	}
	tcpDone := time.Now()

	// Set TCP timing manually (DNS+TCP combined in DialContext, can't separate)
	c.mu.Lock()
	if c.timing != nil {
		c.timing.setTCP(dnsStart, tcpDone)
	}
	c.mu.Unlock()

	// Wrap TCP conn to capture raw TLS bytes
	logged := newLoggedConn(tcpConn)

	c.mu.Lock()
	c.connLogs = append(c.connLogs, logged)
	c.lastTarget = addr
	c.mu.Unlock()

	hostname, _, _ := net.SplitHostPort(addr)
	tlsCfg := &utls.Config{
		ServerName: hostname,
	}

	var helloID utls.ClientHelloID
	var spec *utls.ClientHelloSpec

	if c.tlsConfig != nil && c.tlsConfig.Preset == "custom" && c.tlsConfig.CustomJA3 != "" {
		helloID = utls.HelloCustom
		parsed, err := tlspkg.ParseJA3Text(c.tlsConfig.CustomJA3)
		if err != nil {
			logged.Close()
			return nil, err
		}
		spec = tlspkg.BuildSpecFromJA3(parsed)
	} else if c.tlsConfig != nil {
		helloID = tlspkg.GetClientHelloID(c.tlsConfig.Preset)
	} else {
		helloID = utls.HelloChrome_Auto
	}

	// TLS timing
	tlsStart := time.Now()
	uConn := utls.UClient(logged, tlsCfg, helloID)

	if spec != nil {
		if err := uConn.ApplyPreset(spec); err != nil {
			logged.Close()
			return nil, err
		}
	}

	if err := uConn.HandshakeContext(ctx); err != nil {
		uConn.Close()
		return nil, err
	}
	tlsDone := time.Now()

	c.mu.Lock()
	if c.timing != nil {
		c.timing.setTLS(tlsStart, tlsDone)
	}

	// Capture TLS connection state for response info
	state := uConn.ConnectionState()
	c.lastTLSInfo = &models.TlsHandshakeInfo{
		Version:     tlsVersionString(state.Version),
		CipherSuite: tls.CipherSuiteName(state.CipherSuite),
		ALPN:        state.NegotiatedProtocol,
	}
	c.mu.Unlock()

	return uConn, nil
}

func (c *Client) buildTransport(config *models.RequestConfig) http.RoundTripper {
	// If custom Akamai fingerprint is provided, use CustomH2Transport for exact control
	if c.tlsConfig != nil && c.tlsConfig.Preset == "custom" && c.tlsConfig.CustomAkamai != "" {
		parsed, err := http2fp.ParseAkamaiText(c.tlsConfig.CustomAkamai)
		if err == nil {
			// Extract header order from request config
			var headerOrder []string
			if config != nil {
				for _, h := range config.Headers {
					if h.Enabled && h.Key != "" {
						headerOrder = append(headerOrder, h.Key)
					}
				}
			}
			return &http2fp.CustomH2Transport{
				DialTLSContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
					return c.dialTLS(ctx, network, addr)
				},
				Fingerprint: parsed,
				HeaderOrder: headerOrder,
			}
		}
	}

	// Default: use http2.Transport with utls DialTLS
	h2Transport := &http2.Transport{
		DialTLSContext: func(ctx context.Context, network, addr string, _ *tls.Config) (net.Conn, error) {
			return c.dialTLS(ctx, network, addr)
		},
	}

	h1Transport := &http.Transport{
		Proxy: nil, // Disable Go's default proxy (ProxyFromEnvironment) - we handle proxy via custom dialer
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			return c.dialer.DialContext(ctx, network, addr)
		},
		DialTLSContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			return c.dialTLS(ctx, network, addr)
		},
	}

	return &h2FallbackTransport{h2: h2Transport, h1: h1Transport}
}

// h2FallbackTransport tries HTTP/2 first, falls back to HTTP/1.1
type h2FallbackTransport struct {
	h2 *http2.Transport
	h1 *http.Transport
}

func (t *h2FallbackTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// For HTTPS, try HTTP/2 first
	if req.URL.Scheme == "https" {
		resp, err := t.h2.RoundTrip(req)
		if err == nil {
			return resp, nil
		}
		// H2 failed; close its transport to release the TLS connection from the failed attempt
		t.h2.CloseIdleConnections()
		// Fall back to HTTP/1.1
	}
	return t.h1.RoundTrip(req)
}

// closeTransport closes idle connections on the transport after use.
func closeTransport(rt http.RoundTripper) {
	switch t := rt.(type) {
	case *h2FallbackTransport:
		t.h2.CloseIdleConnections()
		t.h1.CloseIdleConnections()
	case *http2fp.CustomH2Transport:
		// CustomH2Transport manages its own connections; no-op
	}
}
