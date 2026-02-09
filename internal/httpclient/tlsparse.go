package httpclient

import (
	"crypto/x509"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"jiemian/internal/models"
)

// parseTLSRecords parses raw connection entries into ConnEvents with TLS annotations
func parseTLSRecords(entries []connEntry) []models.ConnEvent {
	var events []models.ConnEvent

	for _, e := range entries {
		ev := models.ConnEvent{
			Time:      float64(e.elapsed.Microseconds()) / 1000.0,
			Direction: e.direction,
			Size:      len(e.data),
		}

		if len(e.data) >= 5 {
			ev.Summary, ev.Detail = annotateTLS(e.data)
		}
		if ev.Summary == "" {
			ev.Summary = "Data"
		}

		// Uniform format: always append (N bytes)
		ev.Summary = fmt.Sprintf("%s (%d bytes)", ev.Summary, len(e.data))

		// Full hex, no truncation
		ev.HexPreview = hex.EncodeToString(e.data)

		events = append(events, ev)
	}
	return events
}

// annotateTLS parses TLS record layer and returns summary + detail
func annotateTLS(data []byte) (string, string) {
	if len(data) < 5 {
		return "", ""
	}

	contentType := data[0]
	version := binary.BigEndian.Uint16(data[1:3])
	recordLen := int(binary.BigEndian.Uint16(data[3:5]))

	verStr := tlsVersionString(version)

	// Bound payload to the declared record length to avoid reading into next record
	payload := data[5:]
	if recordLen < len(payload) {
		payload = payload[:recordLen]
	}

	switch contentType {
	case 20: // ChangeCipherSpec
		return "ChangeCipherSpec", verStr
	case 21: // Alert
		return parseAlert(payload, verStr)
	case 22: // Handshake
		return parseHandshake(payload, verStr)
	case 23: // ApplicationData
		return "Application Data", verStr
	default:
		return fmt.Sprintf("TLS Record (type=%d)", contentType), verStr
	}
}

func parseHandshake(data []byte, verStr string) (string, string) {
	if len(data) < 4 {
		return "Handshake", verStr
	}
	hsType := data[0]
	switch hsType {
	case 1:
		return "ClientHello", parseClientHello(data[4:], verStr)
	case 2:
		return "ServerHello", parseServerHello(data[4:], verStr)
	case 11:
		return "Certificate", parseCertificate(data[4:], verStr)
	case 12:
		return "ServerKeyExchange", verStr
	case 13:
		return "CertificateRequest", verStr
	case 14:
		return "ServerHelloDone", verStr
	case 15:
		return "CertificateVerify", verStr
	case 16:
		return "ClientKeyExchange", verStr
	case 20:
		return "Finished", verStr
	default:
		return fmt.Sprintf("Handshake (type=%d)", hsType), verStr
	}
}

func parseClientHello(data []byte, verStr string) string {
	var parts []string
	parts = append(parts, verStr)

	// Skip client_version(2) + random(32) = 34 bytes
	if len(data) < 34 {
		return verStr
	}
	pos := 34

	// session_id
	if pos >= len(data) {
		return strings.Join(parts, ", ")
	}
	sidLen := int(data[pos])
	if pos+1+sidLen > len(data) {
		return strings.Join(parts, ", ")
	}
	pos += 1 + sidLen

	// cipher_suites
	if pos+2 > len(data) {
		return strings.Join(parts, ", ")
	}
	csLen := int(binary.BigEndian.Uint16(data[pos : pos+2]))
	numCiphers := csLen / 2
	parts = append(parts, fmt.Sprintf("Ciphers: %d", numCiphers))
	pos += 2 + csLen

	// compression_methods
	if pos >= len(data) {
		return strings.Join(parts, ", ")
	}
	compLen := int(data[pos])
	pos += 1 + compLen

	// extensions
	if pos+2 > len(data) {
		return strings.Join(parts, ", ")
	}
	extTotalLen := int(binary.BigEndian.Uint16(data[pos : pos+2]))
	pos += 2
	extEnd := pos + extTotalLen
	extCount := 0
	sni := ""

	for pos+4 <= len(data) && pos < extEnd {
		extType := binary.BigEndian.Uint16(data[pos : pos+2])
		extLen := int(binary.BigEndian.Uint16(data[pos+2 : pos+4]))
		extCount++

		// SNI extension (type 0)
		if extType == 0 && extLen > 5 && pos+4+extLen <= len(data) {
			nameLen := int(binary.BigEndian.Uint16(data[pos+7 : pos+9]))
			if pos+9+nameLen <= len(data) {
				sni = string(data[pos+9 : pos+9+nameLen])
			}
		}
		pos += 4 + extLen
	}

	parts = append(parts, fmt.Sprintf("Extensions: %d", extCount))
	if sni != "" {
		parts = append(parts, fmt.Sprintf("SNI: %s", sni))
	}
	return strings.Join(parts, ", ")
}

func parseServerHello(data []byte, verStr string) string {
	var parts []string
	parts = append(parts, verStr)

	// server_version(2) + random(32) = 34
	if len(data) < 34 {
		return verStr
	}
	serverVer := binary.BigEndian.Uint16(data[0:2])
	parts[0] = tlsVersionString(serverVer)
	pos := 34

	// session_id
	if pos >= len(data) {
		return strings.Join(parts, ", ")
	}
	sidLen := int(data[pos])
	if pos+1+sidLen > len(data) {
		return strings.Join(parts, ", ")
	}
	pos += 1 + sidLen

	// cipher_suite (2 bytes)
	if pos+2 > len(data) {
		return strings.Join(parts, ", ")
	}
	cs := binary.BigEndian.Uint16(data[pos : pos+2])
	parts = append(parts, fmt.Sprintf("Cipher: 0x%04X", cs))

	return strings.Join(parts, ", ")
}

func parseCertificate(data []byte, verStr string) string {
	// certificates_length (3 bytes)
	if len(data) < 3 {
		return verStr
	}
	pos := 3

	var parts []string
	certIdx := 0
	for pos+3 <= len(data) && certIdx < 3 {
		certLen := int(data[pos])<<16 | int(data[pos+1])<<8 | int(data[pos+2])
		pos += 3
		if pos+certLen > len(data) {
			break
		}
		cert, err := x509.ParseCertificate(data[pos : pos+certLen])
		if err == nil {
			cn := cert.Subject.CommonName
			issuer := cert.Issuer.CommonName
			notAfter := cert.NotAfter.Format(time.DateOnly)
			if certIdx == 0 {
				parts = append(parts, fmt.Sprintf("CN=%s, Issuer=%s, Expires=%s", cn, issuer, notAfter))
			} else {
				parts = append(parts, fmt.Sprintf("CA: %s", cn))
			}
		}
		pos += certLen
		certIdx++
	}
	if len(parts) == 0 {
		return verStr
	}
	return strings.Join(parts, " | ")
}

func parseAlert(data []byte, verStr string) (string, string) {
	if len(data) < 2 {
		return "Alert", verStr
	}
	level := "warning"
	if data[0] == 2 {
		level = "fatal"
	}
	desc := alertDescription(data[1])
	return fmt.Sprintf("Alert: %s (%s)", desc, level), verStr
}

func alertDescription(code byte) string {
	switch code {
	case 0:
		return "close_notify"
	case 10:
		return "unexpected_message"
	case 20:
		return "bad_record_mac"
	case 40:
		return "handshake_failure"
	case 42:
		return "bad_certificate"
	case 48:
		return "unknown_ca"
	case 50:
		return "decode_error"
	case 70:
		return "protocol_version"
	case 112:
		return "unrecognized_name"
	default:
		return fmt.Sprintf("code_%d", code)
	}
}
