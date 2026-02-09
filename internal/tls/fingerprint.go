package tls

import (
	"context"
	"fmt"
	"net"

	utls "github.com/refraction-networking/utls"
	"jiemian/internal/models"
)

func DialTLS(ctx context.Context, network, addr string, config *models.TlsConfig) (*utls.UConn, error) {
	dialer := &net.Dialer{}
	tcpConn, err := dialer.DialContext(ctx, network, addr)
	if err != nil {
		return nil, fmt.Errorf("failed to dial TCP: %w", err)
	}

	hostname := extractHostname(addr)
	tlsConfig := &utls.Config{
		ServerName:         hostname,
		InsecureSkipVerify: false,
	}

	var helloID utls.ClientHelloID
	var spec *utls.ClientHelloSpec

	if config.Preset == "custom" && config.CustomJA3 != "" {
		helloID = utls.HelloCustom
		parsed, err := ParseJA3Text(config.CustomJA3)
		if err != nil {
			tcpConn.Close()
			return nil, fmt.Errorf("failed to parse JA3: %w", err)
		}
		spec = BuildSpecFromJA3(parsed)
	} else {
		helloID = GetClientHelloID(config.Preset)
	}

	uConn := utls.UClient(tcpConn, tlsConfig, helloID)

	if spec != nil {
		if err := uConn.ApplyPreset(spec); err != nil {
			tcpConn.Close()
			return nil, fmt.Errorf("failed to apply custom spec: %w", err)
		}
	}

	if err := uConn.HandshakeContext(ctx); err != nil {
		uConn.Close()
		return nil, fmt.Errorf("TLS handshake failed: %w", err)
	}

	return uConn, nil
}

// BuildSpecFromJA3 builds a ClientHelloSpec from parsed JA3 components.
// Automatically adds GREASE values to match Chrome browser behavior.
func BuildSpecFromJA3(parsed *ParsedJA3) *utls.ClientHelloSpec {
	// Add GREASE cipher suite at the beginning (Chrome behavior)
	cipherSuites := make([]uint16, 0, len(parsed.CipherSuites)+1)
	cipherSuites = append(cipherSuites, 0x0a0a) // GREASE placeholder
	cipherSuites = append(cipherSuites, parsed.CipherSuites...)

	extensions := mapExtensionIDs(parsed)
	// Add GREASE extension at the beginning and end (Chrome behavior)
	greaseExtensions := make([]utls.TLSExtension, 0, len(extensions)+2)
	greaseExtensions = append(greaseExtensions, &utls.UtlsGREASEExtension{})
	greaseExtensions = append(greaseExtensions, extensions...)
	greaseExtensions = append(greaseExtensions, &utls.UtlsGREASEExtension{})

	// Shuffle extensions like Chrome 106+ to avoid ossification
	greaseExtensions = utls.ShuffleChromeTLSExtensions(greaseExtensions)

	spec := &utls.ClientHelloSpec{
		CipherSuites:       cipherSuites,
		CompressionMethods: []uint8{0},
		Extensions:         greaseExtensions,
	}

	// Set TLS version range
	switch parsed.TLSVersion {
	case 0x0303: // TLS 1.2 (771)
		spec.TLSVersMin = utls.VersionTLS12
		spec.TLSVersMax = utls.VersionTLS13 // Allow TLS 1.3 if extensions support it
	case 0x0304: // TLS 1.3 (772)
		spec.TLSVersMin = utls.VersionTLS12 // Allow TLS 1.2 fallback like real browsers
		spec.TLSVersMax = utls.VersionTLS13
	default:
		spec.TLSVersMin = utls.VersionTLS12
		spec.TLSVersMax = utls.VersionTLS13
	}

	return spec
}

// mapExtensionIDs converts extension numeric IDs to utls TLSExtension objects
// CRITICAL: preserves the exact order from the JA3 string
func mapExtensionIDs(parsed *ParsedJA3) []utls.TLSExtension {
	var extensions []utls.TLSExtension

	// Determine curves for supported_groups
	curves := []utls.CurveID{utls.X25519, utls.CurveP256, utls.CurveP384}
	if len(parsed.Curves) > 0 {
		curves = make([]utls.CurveID, len(parsed.Curves))
		for i, c := range parsed.Curves {
			curves[i] = utls.CurveID(c)
		}
	}

	// Determine point formats
	pointFormats := []uint8{0} // uncompressed
	if len(parsed.PointFormats) > 0 {
		pointFormats = parsed.PointFormats
	}

	// Default signature algorithms (Chrome-like)
	defaultSigAlgs := []utls.SignatureScheme{
		utls.ECDSAWithP256AndSHA256,
		utls.PSSWithSHA256,
		utls.PKCS1WithSHA256,
		utls.ECDSAWithP384AndSHA384,
		utls.PSSWithSHA384,
		utls.PKCS1WithSHA384,
		utls.PSSWithSHA512,
		utls.PKCS1WithSHA512,
	}

	for _, extID := range parsed.Extensions {
		switch extID {
		case 0: // server_name
			extensions = append(extensions, &utls.SNIExtension{})
		case 5: // status_request
			extensions = append(extensions, &utls.StatusRequestExtension{})
		case 10: // supported_groups
			// Add GREASE curve at the beginning (Chrome behavior)
			greasedCurves := make([]utls.CurveID, 0, len(curves)+1)
			greasedCurves = append(greasedCurves, utls.CurveID(0x0a0a)) // GREASE placeholder
			greasedCurves = append(greasedCurves, curves...)
			extensions = append(extensions, &utls.SupportedCurvesExtension{Curves: greasedCurves})
		case 11: // ec_point_formats
			extensions = append(extensions, &utls.SupportedPointsExtension{SupportedPoints: pointFormats})
		case 13: // signature_algorithms
			extensions = append(extensions, &utls.SignatureAlgorithmsExtension{
				SupportedSignatureAlgorithms: defaultSigAlgs,
			})
		case 16: // application_layer_protocol_negotiation
			extensions = append(extensions, &utls.ALPNExtension{
				AlpnProtocols: []string{"h2", "http/1.1"},
			})
		case 17: // status_request_v2
			extensions = append(extensions, &utls.StatusRequestV2Extension{})
		case 18: // signed_certificate_timestamp
			extensions = append(extensions, &utls.SCTExtension{})
		case 21: // padding
			extensions = append(extensions, &utls.UtlsPaddingExtension{GetPaddingLen: utls.BoringPaddingStyle})
		case 23: // extended_master_secret
			extensions = append(extensions, &utls.ExtendedMasterSecretExtension{})
		case 27: // compress_certificate
			extensions = append(extensions, &utls.UtlsCompressCertExtension{
				Algorithms: []utls.CertCompressionAlgo{utls.CertCompressionBrotli},
			})
		case 35: // session_ticket
			extensions = append(extensions, &utls.SessionTicketExtension{})
		case 43: // supported_versions
			// Add GREASE version at the beginning (Chrome behavior)
			extensions = append(extensions, &utls.SupportedVersionsExtension{
				Versions: []uint16{0x0a0a, utls.VersionTLS13, utls.VersionTLS12},
			})
		case 45: // psk_key_exchange_modes
			extensions = append(extensions, &utls.PSKKeyExchangeModesExtension{
				Modes: []uint8{1}, // psk_dhe_ke
			})
		case 51: // key_share
			keyShares := []utls.KeyShare{
				{Group: utls.CurveID(0x0a0a), Data: []byte{0}}, // GREASE placeholder with 1 byte
				{Group: utls.X25519},
			}
			// Add X25519MLKEM768 key share if it's in the curves list
			for _, c := range parsed.Curves {
				if utls.CurveID(c) == utls.X25519MLKEM768 {
					// Insert after GREASE, before X25519
					keyShares = []utls.KeyShare{
						{Group: utls.CurveID(0x0a0a), Data: []byte{0}}, // GREASE
						{Group: utls.X25519MLKEM768},
						{Group: utls.X25519},
					}
					break
				}
			}
			extensions = append(extensions, &utls.KeyShareExtension{
				KeyShares: keyShares,
			})
		case 65281: // renegotiation_info
			extensions = append(extensions, &utls.RenegotiationInfoExtension{})
		case 17513: // application_settings (ALPS, old codepoint)
			extensions = append(extensions, &utls.ApplicationSettingsExtension{
				SupportedProtocols: []string{"h2"},
			})
		case 17613: // application_settings (ALPS, new codepoint Chrome 133+)
			extensions = append(extensions, &utls.ApplicationSettingsExtensionNew{
				SupportedProtocols: []string{"h2"},
			})
		case 65037: // encrypted_client_hello (GREASE ECH)
			extensions = append(extensions, utls.BoringGREASEECH())
		default:
			// Skip GREASE extension IDs from JA3 - we add GREASE separately in BuildSpecFromJA3
			if isGREASE(uint32(extID)) {
				continue
			}
			// For unknown extensions, use GenericExtension to preserve order
			extensions = append(extensions, &utls.GenericExtension{Id: extID})
		}
	}

	return extensions
}

func extractHostname(addr string) string {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return addr
	}
	return host
}
