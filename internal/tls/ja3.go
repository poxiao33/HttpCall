package tls

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"

	utls "github.com/refraction-networking/utls"
)

// CalculateJA3 extracts and calculates the JA3 fingerprint from a utls connection
// JA3 format: SSLVersion,Ciphers,Extensions,EllipticCurves,EllipticCurvePointFormats
func CalculateJA3(conn *utls.UConn) string {
	clientHello := conn.HandshakeState.Hello

	// 1. SSL Version
	version := fmt.Sprintf("%d", clientHello.Vers)

	// 2. Cipher Suites (comma-separated)
	var ciphers []string
	for _, suite := range clientHello.CipherSuites {
		// Skip GREASE values (0x?A?A pattern)
		if !isGREASE(uint32(suite)) {
			ciphers = append(ciphers, strconv.Itoa(int(suite)))
		}
	}
	cipherStr := strings.Join(ciphers, "-")

	// 3. Extensions (comma-separated IDs)
	// Note: utls may not expose all extension details directly
	// This is a simplified implementation
	extensionStr := ""
	curvesStr := ""
	pointFormatsStr := ""

	// Build JA3 string
	ja3String := fmt.Sprintf("%s,%s,%s,%s,%s",
		version,
		cipherStr,
		extensionStr,
		curvesStr,
		pointFormatsStr,
	)

	// Calculate MD5 hash
	hash := md5.Sum([]byte(ja3String))
	return hex.EncodeToString(hash[:])
}

// isGREASE checks if a value is a GREASE value
// GREASE values follow the pattern 0x?A?A where ? is the same nibble
func isGREASE(value uint32) bool {
	grease := []uint32{
		0x0a0a, 0x1a1a, 0x2a2a, 0x3a3a,
		0x4a4a, 0x5a5a, 0x6a6a, 0x7a7a,
		0x8a8a, 0x9a9a, 0xaaaa, 0xbaba,
		0xcaca, 0xdada, 0xeaea, 0xfafa,
	}

	for _, g := range grease {
		if value == g {
			return true
		}
	}
	return false
}

// ParsedJA3 holds the parsed components of a JA3 text string
type ParsedJA3 struct {
	TLSVersion   uint16
	CipherSuites []uint16
	Extensions   []uint16
	Curves       []uint16
	PointFormats []uint8
}

// ParseJA3Text parses a JA3 text string into its components
// Format: TLSVersion,CipherSuites,Extensions,EllipticCurves,PointFormats
// Example: 771,4865-4866-4867-49195,0-23-65281-10-11,29-23-24,0
func ParseJA3Text(ja3 string) (*ParsedJA3, error) {
	parts := strings.Split(ja3, ",")
	if len(parts) < 3 {
		return nil, fmt.Errorf("invalid JA3 format: expected at least 3 comma-separated parts, got %d", len(parts))
	}

	result := &ParsedJA3{}

	// Parse TLS version
	ver, err := strconv.ParseUint(parts[0], 10, 16)
	if err != nil {
		return nil, fmt.Errorf("invalid TLS version: %w", err)
	}
	result.TLSVersion = uint16(ver)

	// Parse cipher suites
	if parts[1] != "" {
		for _, s := range strings.Split(parts[1], "-") {
			id, err := strconv.ParseUint(s, 10, 16)
			if err != nil {
				continue
			}
			result.CipherSuites = append(result.CipherSuites, uint16(id))
		}
	}

	// Parse extensions
	if parts[2] != "" {
		for _, s := range strings.Split(parts[2], "-") {
			id, err := strconv.ParseUint(s, 10, 16)
			if err != nil {
				continue
			}
			result.Extensions = append(result.Extensions, uint16(id))
		}
	}

	// Parse elliptic curves (optional)
	if len(parts) > 3 && parts[3] != "" {
		for _, s := range strings.Split(parts[3], "-") {
			id, err := strconv.ParseUint(s, 10, 16)
			if err != nil {
				continue
			}
			result.Curves = append(result.Curves, uint16(id))
		}
	}

	// Parse point formats (optional)
	if len(parts) > 4 && parts[4] != "" {
		for _, s := range strings.Split(parts[4], "-") {
			id, err := strconv.ParseUint(s, 10, 8)
			if err != nil {
				continue
			}
			result.PointFormats = append(result.PointFormats, uint8(id))
		}
	}

	return result, nil
}
