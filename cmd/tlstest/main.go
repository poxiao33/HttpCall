package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"time"

	utls "github.com/refraction-networking/utls"
	"golang.org/x/net/http2"
	http2fp "jiemian/internal/http2"
	tlspkg "jiemian/internal/tls"
)

func main() {
	// Use browser's actual extension order (NOT sorted) to verify order preservation
	ja3 := "772,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,11-5-17613-27-45-51-16-65281-10-18-13-0-23-65037-43-35,4588-29-23-24,0"
	akamai := "1:65536;2:0;4:6291456;6:262144|15663105|0|m,a,s,p"
	targetURL := "https://tools.scrapfly.io/api/fp/anything"

	mode := "custom"
	if len(os.Args) > 1 {
		mode = os.Args[1]
	}

	parsed, _ := tlspkg.ParseJA3Text(ja3)
	spec := tlspkg.BuildSpecFromJA3(parsed)

	dialTLS := func(ctx context.Context, network, addr string) (net.Conn, error) {
		dialer := &net.Dialer{Timeout: 10 * time.Second}
		tcpConn, err := dialer.DialContext(ctx, network, addr)
		if err != nil {
			return nil, err
		}
		hostname, _, _ := net.SplitHostPort(addr)
		tlsCfg := &utls.Config{ServerName: hostname}

		var uConn *utls.UConn
		if mode == "preset" {
			uConn = utls.UClient(tcpConn, tlsCfg, utls.HelloChrome_Auto)
		} else {
			uConn = utls.UClient(tcpConn, tlsCfg, utls.HelloCustom)
			if err := uConn.ApplyPreset(spec); err != nil {
				tcpConn.Close()
				return nil, fmt.Errorf("ApplyPreset: %w", err)
			}
		}

		if err := uConn.HandshakeContext(ctx); err != nil {
			uConn.Close()
			return nil, fmt.Errorf("handshake: %w", err)
		}
		fmt.Println("TLS connected! Protocol:", uConn.ConnectionState().NegotiatedProtocol)
		return uConn, nil
	}

	var transport http.RoundTripper
	switch mode {
	case "custom":
		fmt.Println("=== CustomH2Transport (custom TLS + custom H2) ===")
		akamaiParsed, _ := http2fp.ParseAkamaiText(akamai)
		transport = &http2fp.CustomH2Transport{
			DialTLSContext: dialTLS,
			Fingerprint:    akamaiParsed,
			HeaderOrder:    []string{"User-Agent", "Accept", "Accept-Language"},
		}
	case "custom-tls":
		fmt.Println("=== standard http2.Transport (custom TLS + std H2) ===")
		transport = &http2.Transport{
			DialTLSContext: func(ctx context.Context, network, addr string, _ *tls.Config) (net.Conn, error) {
				return dialTLS(ctx, network, addr)
			},
		}
	default:
		fmt.Println("=== standard http2.Transport (preset TLS + std H2) ===")
		transport = &http2.Transport{
			DialTLSContext: func(ctx context.Context, network, addr string, _ *tls.Config) (net.Conn, error) {
				return dialTLS(ctx, network, addr)
			},
		}
	}

	client := &http.Client{Transport: transport, Timeout: 15 * time.Second}
	req, _ := http.NewRequest("GET", targetURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("HTTP error:", err)
		return
	}
	defer resp.Body.Close()
	fmt.Printf("Status: %d\n", resp.StatusCode)
	for k, v := range resp.Header {
		fmt.Printf("  %s: %s\n", k, v)
	}
	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("Body length: %d\n%s\n", len(body), string(body))
}
