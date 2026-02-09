package httpclient

import (
	"bytes"
	"compress/flate"
	"compress/gzip"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"strings"
	"unicode/utf8"

	"jiemian/internal/models"
)

func parseResponse(resp *http.Response) (*models.ResponseData, error) {
	defer resp.Body.Close()

	// Limit read to 100 MB to prevent OOM on extremely large responses.
	const maxBodySize = 100 * 1024 * 1024
	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, maxBodySize))
	if err != nil {
		return nil, err
	}

	headers := make(map[string]string)
	for k, v := range resp.Header {
		if len(v) > 1 {
			// Preserve all values for multi-value headers (e.g. Set-Cookie).
			headers[k] = strings.Join(v, "\n")
		} else if len(v) == 1 {
			headers[k] = v[0]
		}
	}

	rawSize := len(bodyBytes)
	contentEncoding := strings.ToLower(resp.Header.Get("Content-Encoding"))

	// Auto-decompress gzip/deflate.
	// If decompression fails, intentionally fall back to the raw (compressed) bytes.
	// The ContentEncoding field is still set so the frontend knows the body may be compressed.
	decompressed, err := decompressBody(bodyBytes, contentEncoding)
	if err == nil && decompressed != nil {
		bodyBytes = decompressed
	}

	// Determine if content is valid UTF-8 text
	isText := utf8.Valid(bodyBytes) && !containsNullBytes(bodyBytes)

	result := &models.ResponseData{
		Status:          resp.StatusCode,
		StatusText:      resp.Status,
		Headers:         headers,
		Size:            rawSize,
		ContentEncoding: contentEncoding,
	}

	if isText {
		result.Body = string(bodyBytes)
		result.IsBase64 = false
	} else {
		result.Body = base64.StdEncoding.EncodeToString(bodyBytes)
		result.IsBase64 = true
	}

	return result, nil
}

func decompressBody(data []byte, encoding string) ([]byte, error) {
	switch encoding {
	case "gzip":
		r, err := gzip.NewReader(bytes.NewReader(data))
		if err != nil {
			return nil, err
		}
		defer r.Close()
		return io.ReadAll(r)
	case "deflate":
		r := flate.NewReader(bytes.NewReader(data))
		defer r.Close()
		return io.ReadAll(r)
	default:
		return nil, nil
	}
}

func containsNullBytes(data []byte) bool {
	return bytes.IndexByte(data, 0) >= 0
}

func tlsVersionString(v uint16) string {
	switch v {
	case 0x0300:
		return "SSL 3.0"
	case tls.VersionTLS10:
		return "TLS 1.0"
	case tls.VersionTLS11:
		return "TLS 1.1"
	case tls.VersionTLS12:
		return "TLS 1.2"
	case tls.VersionTLS13:
		return "TLS 1.3"
	default:
		return fmt.Sprintf("0x%04X", v)
	}
}
