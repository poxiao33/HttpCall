package http2fp

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"golang.org/x/net/http2"
	"golang.org/x/net/http2/hpack"
)

const (
	// maxResponseBodySize is the maximum allowed response body size (100MB).
	maxResponseBodySize = 100 * 1024 * 1024
	// defaultReadTimeout is the default timeout for reading a full response.
	defaultReadTimeout = 30 * time.Second
)

const clientPreface = "PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n"

// CustomH2Transport implements http.RoundTripper with custom HTTP/2 fingerprint.
// It uses raw http2.Framer to control SETTINGS order, WINDOW_UPDATE, and
// pseudo-header order for Akamai fingerprint matching.
type CustomH2Transport struct {
	DialTLSContext func(ctx context.Context, network, addr string) (net.Conn, error)
	Fingerprint    *ParsedAkamai
	HeaderOrder    []string // ordered list of header keys to preserve in HEADERS frame
}

func (t *CustomH2Transport) RoundTrip(req *http.Request) (*http.Response, error) {
	addr := req.URL.Host
	if !strings.Contains(addr, ":") {
		if req.URL.Scheme == "https" {
			addr += ":443"
		} else {
			addr += ":80"
		}
	}

	conn, err := t.DialTLSContext(req.Context(), "tcp", addr)
	if err != nil {
		return nil, err
	}

	// Write HTTP/2 client connection preface
	if _, err := io.WriteString(conn, clientPreface); err != nil {
		conn.Close()
		return nil, fmt.Errorf("write preface: %w", err)
	}

	// Use a buffered writer so all client frames are flushed together
	var writeBuf bytes.Buffer
	fr := http2.NewFramer(&writeBuf, conn)
	fr.AllowIllegalWrites = true
	fr.SetMaxReadFrameSize(1 << 24) // 16MB for reading large responses

	// Write custom SETTINGS frame with exact order from Akamai fingerprint
	settings := make([]http2.Setting, len(t.Fingerprint.Settings))
	for i, s := range t.Fingerprint.Settings {
		settings[i] = http2.Setting{ID: http2.SettingID(s.ID), Val: s.Val}
	}
	if err := fr.WriteSettings(settings...); err != nil {
		conn.Close()
		return nil, fmt.Errorf("write settings: %w", err)
	}

	// Write WINDOW_UPDATE on stream 0
	if t.Fingerprint.WindowUpdateIncrement > 0 {
		if err := fr.WriteWindowUpdate(0, t.Fingerprint.WindowUpdateIncrement); err != nil {
			conn.Close()
			return nil, fmt.Errorf("write window_update: %w", err)
		}
	}

	// Encode request headers with custom pseudo-header order
	headerBlock, err := t.encodeHeaders(req)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("encode headers: %w", err)
	}

	// Determine whether the request has a body to send
	hasBody := req.Body != nil && req.ContentLength != 0

	// Write HEADERS frame on stream 1
	if err := fr.WriteHeaders(http2.HeadersFrameParam{
		StreamID:      1,
		BlockFragment: headerBlock,
		EndStream:     !hasBody,
		EndHeaders:    true,
	}); err != nil {
		conn.Close()
		return nil, fmt.Errorf("write headers: %w", err)
	}

	// Write DATA frames for the request body (Issue #4)
	if hasBody {
		defer req.Body.Close()
		const maxFrameSize = 16384
		dataBuf := make([]byte, maxFrameSize)
		for {
			n, readErr := req.Body.Read(dataBuf)
			if n > 0 {
				endStream := readErr == io.EOF
				if err := fr.WriteData(1, endStream, dataBuf[:n]); err != nil {
					conn.Close()
					return nil, fmt.Errorf("write data: %w", err)
				}
				if endStream {
					break
				}
			}
			if readErr != nil {
				if readErr == io.EOF {
					// Body ended exactly on a read boundary; send empty DATA with EndStream
					if err := fr.WriteData(1, true, nil); err != nil {
						conn.Close()
						return nil, fmt.Errorf("write data: %w", err)
					}
					break
				}
				conn.Close()
				return nil, fmt.Errorf("read request body: %w", readErr)
			}
		}
	}

	// Flush all buffered frames to the connection at once
	if _, err := conn.Write(writeBuf.Bytes()); err != nil {
		conn.Close()
		return nil, fmt.Errorf("flush frames: %w", err)
	}

	// Now create a new framer for reading (writes go directly to conn for ACKs etc.)
	readFr := http2.NewFramer(conn, conn)
	readFr.AllowIllegalWrites = true
	readFr.SetMaxReadFrameSize(1 << 24)

	// Read response frames
	resp, err := readResponse(req.Context(), readFr, conn, 1, req)
	if err != nil {
		conn.Close()
		return nil, err
	}
	resp.Body = &connClosingBody{ReadCloser: resp.Body, conn: conn}
	return resp, nil
}

func (t *CustomH2Transport) encodeHeaders(req *http.Request) ([]byte, error) {
	var buf bytes.Buffer
	enc := hpack.NewEncoder(&buf)

	path := req.URL.RequestURI()
	if path == "" {
		path = "/"
	}

	pseudoHeaders := map[string]string{
		":method":    req.Method,
		":authority": req.URL.Host,
		":scheme":    req.URL.Scheme,
		":path":      path,
	}

	// Write pseudo-headers in custom order from Akamai fingerprint
	order := t.Fingerprint.HeaderOrder
	if len(order) == 0 {
		order = []string{":method", ":authority", ":scheme", ":path"}
	}
	for _, h := range order {
		if val, ok := pseudoHeaders[h]; ok {
			enc.WriteField(hpack.HeaderField{Name: h, Value: val})
		}
	}

	// Write regular headers in specified order to match browser fingerprint
	if len(t.HeaderOrder) > 0 {
		written := make(map[string]bool)
		for _, key := range t.HeaderOrder {
			canonical := http.CanonicalHeaderKey(key)
			if vals, ok := req.Header[canonical]; ok {
				lk := strings.ToLower(key)
				for _, val := range vals {
					enc.WriteField(hpack.HeaderField{Name: lk, Value: val})
				}
				written[canonical] = true
			}
		}
		// Write any remaining headers not in the order list
		for key, vals := range req.Header {
			if written[key] {
				continue
			}
			lk := strings.ToLower(key)
			for _, val := range vals {
				enc.WriteField(hpack.HeaderField{Name: lk, Value: val})
			}
		}
	} else {
		for key, vals := range req.Header {
			lk := strings.ToLower(key)
			for _, val := range vals {
				enc.WriteField(hpack.HeaderField{Name: lk, Value: val})
			}
		}
	}

	return buf.Bytes(), nil
}

func readResponse(ctx context.Context, fr *http2.Framer, conn net.Conn, streamID uint32, req *http.Request) (*http.Response, error) {
	resp := &http.Response{
		Request:    req,
		Header:     make(http.Header),
		Proto:      "HTTP/2.0",
		ProtoMajor: 2,
	}

	// Set a read deadline based on context or default timeout (Issue #7)
	deadline, ok := ctx.Deadline()
	if !ok {
		deadline = time.Now().Add(defaultReadTimeout)
	}
	if err := conn.SetReadDeadline(deadline); err != nil {
		return nil, fmt.Errorf("set read deadline: %w", err)
	}
	// Monitor context cancellation in a separate goroutine
	done := make(chan struct{})
	defer close(done)
	go func() {
		select {
		case <-ctx.Done():
			conn.SetReadDeadline(time.Now())
		case <-done:
		}
	}()

	var bodyBuf bytes.Buffer
	dec := hpack.NewDecoder(65536, nil) // Issue #8: use 65536 to match common server configs
	headersReceived := false

	for {
		f, err := fr.ReadFrame()
		if err != nil {
			if headersReceived {
				resp.Body = io.NopCloser(&bodyBuf)
				resp.ContentLength = int64(bodyBuf.Len())
				return resp, nil
			}
			return nil, fmt.Errorf("read response: %w", err)
		}

		switch f := f.(type) {
		case *http2.HeadersFrame:
			if f.StreamID != streamID {
				continue
			}
			headers, err := dec.DecodeFull(f.HeaderBlockFragment())
			if err != nil {
				return nil, fmt.Errorf("decode headers: %w", err)
			}
			for _, hf := range headers {
				if hf.Name == ":status" {
					code, err := strconv.Atoi(hf.Value)
					if err != nil {
						log.Printf("http2: non-numeric :status %q, defaulting to 0", hf.Value)
					}
					resp.StatusCode = code
					resp.Status = hf.Value + " " + http.StatusText(code)
				} else {
					resp.Header.Add(hf.Name, hf.Value)
				}
			}
			headersReceived = true
			if f.StreamEnded() {
				resp.Body = io.NopCloser(&bodyBuf)
				return resp, nil
			}

		case *http2.DataFrame:
			if f.StreamID != streamID {
				continue
			}
			if bodyBuf.Len()+len(f.Data()) > maxResponseBodySize {
				return nil, fmt.Errorf("response body exceeds %d byte limit", maxResponseBodySize)
			}
			bodyBuf.Write(f.Data())
			// Send WINDOW_UPDATE to keep flow control going
			if n := len(f.Data()); n > 0 {
				fr.WriteWindowUpdate(0, uint32(n))
				fr.WriteWindowUpdate(streamID, uint32(n))
			}
			if f.StreamEnded() {
				resp.Body = io.NopCloser(&bodyBuf)
				resp.ContentLength = int64(bodyBuf.Len())
				return resp, nil
			}

		case *http2.SettingsFrame:
			if !f.IsAck() {
				fr.WriteSettingsAck()
			}

		case *http2.PingFrame:
			if !f.IsAck() {
				fr.WritePing(true, f.Data)
			}

		case *http2.WindowUpdateFrame:
			// ignore

		case *http2.GoAwayFrame:
			if headersReceived {
				resp.Body = io.NopCloser(&bodyBuf)
				resp.ContentLength = int64(bodyBuf.Len())
				return resp, nil
			}
			// If GOAWAY includes our stream and NO_ERROR, keep reading for response
			if f.ErrCode == http2.ErrCodeNo && f.LastStreamID >= streamID {
				continue
			}
			return nil, fmt.Errorf("GOAWAY: %v", f.ErrCode)

		case *http2.RSTStreamFrame:
			if f.StreamID == streamID {
				if headersReceived {
					resp.Body = io.NopCloser(&bodyBuf)
					resp.ContentLength = int64(bodyBuf.Len())
					return resp, nil
				}
				return nil, fmt.Errorf("RST_STREAM: %v", f.ErrCode)
			}
		}
	}
}

type connClosingBody struct {
	io.ReadCloser
	conn net.Conn
}

func (b *connClosingBody) Close() error {
	innerErr := b.ReadCloser.Close()
	connErr := b.conn.Close()
	if connErr != nil {
		return connErr
	}
	return innerErr
}
