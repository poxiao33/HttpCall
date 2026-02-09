package http2fp

import (
	"fmt"
	"strconv"
	"strings"
)

// ParsedAkamai holds parsed Akamai HTTP/2 fingerprint components
type ParsedAkamai struct {
	Settings              []Setting // SETTINGS frame parameters in order
	WindowUpdateIncrement uint32
	PriorityFrames        string   // raw priority string (e.g., "0" or "3:0:0:201,5:0:0:101,...")
	HeaderOrder           []string // pseudo-header order (e.g., [":method", ":authority", ":scheme", ":path"])
}

// ParseAkamaiText parses an Akamai fingerprint string
// Format: SETTINGS|WINDOW_UPDATE|PRIORITY|HEADER_ORDER
// Example: 1:65536;2:0;4:6291456;6:262144|15663105|0|m,a,s,p
func ParseAkamaiText(akamai string) (*ParsedAkamai, error) {
	if akamai == "" {
		return nil, fmt.Errorf("empty Akamai fingerprint")
	}

	parts := strings.Split(akamai, "|")

	result := &ParsedAkamai{}

	// Part 1: SETTINGS (e.g., "1:65536;2:0;4:6291456;6:262144")
	if parts[0] != "" {
		for _, pair := range strings.Split(parts[0], ";") {
			kv := strings.SplitN(pair, ":", 2)
			if len(kv) != 2 {
				continue
			}
			id, err := strconv.ParseUint(kv[0], 10, 16)
			if err != nil {
				continue
			}
			val, err := strconv.ParseUint(kv[1], 10, 32)
			if err != nil {
				continue
			}
			result.Settings = append(result.Settings, Setting{
				ID:  uint16(id),
				Val: uint32(val),
			})
		}
	}

	// Part 2: WINDOW_UPDATE
	if len(parts) > 1 && parts[1] != "" {
		val, err := strconv.ParseUint(parts[1], 10, 32)
		if err == nil {
			result.WindowUpdateIncrement = uint32(val)
		}
	}

	// Part 3: PRIORITY
	if len(parts) > 2 {
		result.PriorityFrames = parts[2]
	}

	// Part 4: HEADER_ORDER (e.g., "m,a,s,p")
	if len(parts) > 3 && parts[3] != "" {
		letterMap := map[string]string{
			"m": ":method",
			"a": ":authority",
			"s": ":scheme",
			"p": ":path",
		}
		for _, letter := range strings.Split(parts[3], ",") {
			if header, ok := letterMap[strings.TrimSpace(letter)]; ok {
				result.HeaderOrder = append(result.HeaderOrder, header)
			}
		}
	}

	return result, nil
}
