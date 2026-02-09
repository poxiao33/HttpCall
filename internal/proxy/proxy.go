package proxy

import (
	"bufio"
	"context"
	"encoding/base64"
	"fmt"
	"net"
	"net/http"
	"net/url"

	"golang.org/x/net/proxy"
	"jiemian/internal/models"
)

// Dialer interface for creating network connections
type Dialer interface {
	DialContext(ctx context.Context, network, addr string) (net.Conn, error)
}

// nilDialer implements direct TCP connection without proxy
type nilDialer struct{}

// NilDialer returns a dialer that makes direct connections
func NilDialer() Dialer {
	return &nilDialer{}
}

func (d *nilDialer) DialContext(ctx context.Context, network, addr string) (net.Conn, error) {
	var dialer net.Dialer
	return dialer.DialContext(ctx, network, addr)
}

// httpProxyDialer implements HTTP CONNECT proxy
type httpProxyDialer struct {
	proxyAddr string
	auth      *models.ProxyAuth
}

func (d *httpProxyDialer) DialContext(ctx context.Context, network, addr string) (net.Conn, error) {
	// Connect to proxy server
	var dialer net.Dialer
	conn, err := dialer.DialContext(ctx, "tcp", d.proxyAddr)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to proxy: %w", err)
	}

	// Send CONNECT request for HTTPS tunneling
	connectReq := &http.Request{
		Method: "CONNECT",
		URL:    &url.URL{Opaque: addr},
		Host:   addr,
		Header: make(http.Header),
	}

	// Add proxy authentication if configured
	if d.auth != nil && d.auth.Username != "" {
		credentials := base64.StdEncoding.EncodeToString(
			[]byte(d.auth.Username + ":" + d.auth.Password),
		)
		connectReq.Header.Set("Proxy-Authorization", "Basic "+credentials)
	}

	// Write CONNECT request
	if err := connectReq.Write(conn); err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to write CONNECT request: %w", err)
	}

	// Read response
	br := bufio.NewReader(conn)
	resp, err := http.ReadResponse(br, connectReq)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to read CONNECT response: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		conn.Close()
		return nil, fmt.Errorf("proxy CONNECT failed: %s", resp.Status)
	}

	return conn, nil
}

// socks5Dialer wraps golang.org/x/net/proxy SOCKS5 dialer
type socks5Dialer struct {
	dialer proxy.Dialer
}

func (d *socks5Dialer) DialContext(ctx context.Context, network, addr string) (net.Conn, error) {
	// Check if the underlying dialer supports DialContext
	if contextDialer, ok := d.dialer.(proxy.ContextDialer); ok {
		return contextDialer.DialContext(ctx, network, addr)
	}
	// Fallback to regular Dial (without context support)
	return d.dialer.Dial(network, addr)
}

// NewDialer creates a proxy dialer based on the configuration
func NewDialer(config *models.ProxyConfig) (Dialer, error) {
	if config == nil || config.Type == "none" || config.Type == "" {
		return NilDialer(), nil
	}

	proxyAddr := fmt.Sprintf("%s:%d", config.Host, config.Port)

	switch config.Type {
	case "http":
		return &httpProxyDialer{
			proxyAddr: proxyAddr,
			auth:      config.Auth,
		}, nil

	case "socks5":
		var auth *proxy.Auth
		if config.Auth != nil && config.Auth.Username != "" {
			auth = &proxy.Auth{
				User:     config.Auth.Username,
				Password: config.Auth.Password,
			}
		}

		dialer, err := proxy.SOCKS5("tcp", proxyAddr, auth, proxy.Direct)
		if err != nil {
			return nil, fmt.Errorf("failed to create SOCKS5 dialer: %w", err)
		}

		return &socks5Dialer{dialer: dialer}, nil

	default:
		return nil, fmt.Errorf("unsupported proxy type: %s", config.Type)
	}
}
