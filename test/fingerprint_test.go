package test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"jiemian/internal/httpclient"
	"jiemian/internal/models"
)

func newTlsConfig(preset string) *models.TlsConfig {
	return &models.TlsConfig{
		Preset: preset,
	}
}

// TestBasicRequest verifies basic HTTP GET works
func TestBasicRequest(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	tlsConfig := newTlsConfig("chrome_131")
	client, err := httpclient.New(tlsConfig, nil)
	if err != nil {
		t.Fatalf("failed to create client: %v", err)
	}

	req := &models.RequestConfig{
		Method: "GET",
		URL:    "https://httpbin.org/get",
	}

	resp, err := client.Send(ctx, req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.Status != 200 {
		t.Errorf("expected status 200, got %d", resp.Status)
	}
	if resp.Body == "" {
		t.Error("response body is empty")
	}
	if resp.Timing.Total <= 0 {
		t.Error("timing.total should be > 0")
	}
	t.Logf("Status: %d, Size: %d, Total: %dms", resp.Status, resp.Size, resp.Timing.Total)
}

// peetWSResponse represents the JSON response from tls.peet.ws/api/all
type peetWSResponse struct {
	TLS struct {
		JA3      string `json:"ja3"`
		JA3Hash  string `json:"ja3_hash"`
		Akamai   string `json:"akamai"`
		AkamaiHash string `json:"akamai_hash"`
	} `json:"tls"`
	HTTP2 struct {
		AkamaiFingerprint string `json:"akamai_fingerprint"`
		SendFrames        []struct {
			FrameType string `json:"frame_type"`
		} `json:"sent_frames"`
	} `json:"http2"`
}

// TestChromeTLSFingerprint verifies Chrome TLS fingerprint against tls.peet.ws
func TestChromeTLSFingerprint(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	tlsConfig := newTlsConfig("chrome_131")
	client, err := httpclient.New(tlsConfig, nil)
	if err != nil {
		t.Fatalf("failed to create client: %v", err)
	}

	req := &models.RequestConfig{
		Method: "GET",
		URL:    "https://tls.peet.ws/api/all",
	}

	resp, err := client.Send(ctx, req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.Status != 200 {
		t.Fatalf("expected status 200, got %d", resp.Status)
	}

	var peetResp peetWSResponse
	if err := json.Unmarshal([]byte(resp.Body), &peetResp); err != nil {
		t.Fatalf("failed to parse peet.ws response: %v", err)
	}

	t.Logf("JA3 Hash: %s", peetResp.TLS.JA3Hash)
	t.Logf("JA3: %s", peetResp.TLS.JA3)
	t.Logf("Akamai: %s", peetResp.TLS.Akamai)
	t.Logf("HTTP/2 Akamai: %s", peetResp.HTTP2.AkamaiFingerprint)

	if peetResp.TLS.JA3Hash == "" {
		t.Error("JA3 hash should not be empty")
	}
	if peetResp.TLS.JA3 == "" {
		t.Error("JA3 string should not be empty")
	}
}

// TestFirefoxTLSFingerprint verifies Firefox TLS fingerprint
func TestFirefoxTLSFingerprint(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	tlsConfig := newTlsConfig("firefox_133")
	client, err := httpclient.New(tlsConfig, nil)
	if err != nil {
		t.Fatalf("failed to create client: %v", err)
	}

	req := &models.RequestConfig{
		Method: "GET",
		URL:    "https://tls.peet.ws/api/all",
	}

	resp, err := client.Send(ctx, req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	var peetResp peetWSResponse
	if err := json.Unmarshal([]byte(resp.Body), &peetResp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	t.Logf("Firefox JA3 Hash: %s", peetResp.TLS.JA3Hash)
	t.Logf("Firefox JA3: %s", peetResp.TLS.JA3)

	if peetResp.TLS.JA3Hash == "" {
		t.Error("Firefox JA3 hash should not be empty")
	}
}

// TestSafariTLSFingerprint verifies Safari TLS fingerprint
func TestSafariTLSFingerprint(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	tlsConfig := newTlsConfig("safari_18")
	client, err := httpclient.New(tlsConfig, nil)
	if err != nil {
		t.Fatalf("failed to create client: %v", err)
	}

	req := &models.RequestConfig{
		Method: "GET",
		URL:    "https://tls.peet.ws/api/all",
	}

	resp, err := client.Send(ctx, req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	var peetResp peetWSResponse
	if err := json.Unmarshal([]byte(resp.Body), &peetResp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	t.Logf("Safari JA3 Hash: %s", peetResp.TLS.JA3Hash)
	t.Logf("Safari JA3: %s", peetResp.TLS.JA3)

	if peetResp.TLS.JA3Hash == "" {
		t.Error("Safari JA3 hash should not be empty")
	}
}

// TestRedirectChain verifies redirect tracking works
func TestRedirectChain(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	tlsConfig := newTlsConfig("chrome_131")
	client, err := httpclient.New(tlsConfig, nil)
	if err != nil {
		t.Fatalf("failed to create client: %v", err)
	}

	req := &models.RequestConfig{
		Method:          "GET",
		URL:             "https://httpbin.org/redirect/3",
		FollowRedirects: true,
		MaxRedirects:    10,
	}

	resp, err := client.Send(ctx, req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.Status != 200 {
		t.Errorf("expected final status 200, got %d", resp.Status)
	}

	if len(resp.Redirects) == 0 {
		t.Error("expected redirect hops, got none")
	}

	t.Logf("Redirect hops: %d", len(resp.Redirects))
	for i, hop := range resp.Redirects {
		t.Logf("  Hop %d: %s → %d", i+1, hop.URL, hop.Status)
	}
}

// TestTLSInfo verifies TLS handshake info is captured
func TestTLSInfo(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	tlsConfig := newTlsConfig("chrome_131")
	client, err := httpclient.New(tlsConfig, nil)
	if err != nil {
		t.Fatalf("failed to create client: %v", err)
	}

	req := &models.RequestConfig{
		Method: "GET",
		URL:    "https://www.google.com",
	}

	resp, err := client.Send(ctx, req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.TlsInfo == nil {
		t.Fatal("TLS info should not be nil for HTTPS request")
	}

	if resp.TlsInfo.Version == "" || resp.TlsInfo.Version == "Unknown" {
		t.Errorf("TLS version should be set, got: %s", resp.TlsInfo.Version)
	}
	if resp.TlsInfo.CipherSuite == "" {
		t.Error("cipher suite should not be empty")
	}

	t.Logf("TLS Version: %s", resp.TlsInfo.Version)
	t.Logf("Cipher Suite: %s", resp.TlsInfo.CipherSuite)
	t.Logf("ALPN: %s", resp.TlsInfo.ALPN)
}

// TestDifferentPresets verifies different presets produce different JA3 hashes
func TestDifferentPresets(t *testing.T) {
	presets := []string{"chrome_131", "firefox_133", "safari_18"}
	ja3Hashes := make(map[string]string)

	for _, preset := range presets {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)

		tlsConfig := newTlsConfig(preset)
		client, err := httpclient.New(tlsConfig, nil)
		if err != nil {
			cancel()
			t.Fatalf("failed to create client for %s: %v", preset, err)
		}

		req := &models.RequestConfig{
			Method: "GET",
			URL:    "https://tls.peet.ws/api/all",
		}

		resp, err := client.Send(ctx, req)
		cancel()
		if err != nil {
			t.Fatalf("request failed for %s: %v", preset, err)
		}

		var peetResp peetWSResponse
		if err := json.Unmarshal([]byte(resp.Body), &peetResp); err != nil {
			t.Fatalf("failed to parse response for %s: %v", preset, err)
		}

		ja3Hashes[preset] = peetResp.TLS.JA3Hash
		t.Logf("%s JA3: %s", preset, peetResp.TLS.JA3Hash)
	}

	// Verify Chrome and Firefox have different JA3 hashes
	if ja3Hashes["chrome_131"] == ja3Hashes["firefox_133"] {
		t.Error("Chrome and Firefox should have different JA3 hashes")
	}
}

// TestHTTPHeaders verifies custom headers are sent
func TestHTTPHeaders(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	tlsConfig := newTlsConfig("chrome_131")
	client, err := httpclient.New(tlsConfig, nil)
	if err != nil {
		t.Fatalf("failed to create client: %v", err)
	}

	req := &models.RequestConfig{
		Method: "GET",
		URL:    "https://httpbin.org/headers",
		Headers: []models.KeyValuePair{
			{ID: "1", Key: "X-Custom-Header", Value: "test-value", Enabled: true},
			{ID: "2", Key: "User-Agent", Value: "JiemianTest/1.0", Enabled: true},
		},
	}

	resp, err := client.Send(ctx, req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if !strings.Contains(resp.Body, "X-Custom-Header") {
		t.Error("response should contain X-Custom-Header")
	}
	if !strings.Contains(resp.Body, "JiemianTest/1.0") {
		t.Error("response should contain custom User-Agent")
	}

	t.Logf("Response body: %s", resp.Body[:min(200, len(resp.Body))])
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
