package http2fp

// Setting represents an HTTP/2 SETTINGS parameter
type Setting struct {
	ID  uint16
	Val uint32
}

// HTTP/2 SETTINGS identifiers
const (
	SettingHeaderTableSize      uint16 = 0x1
	SettingEnablePush           uint16 = 0x2
	SettingMaxConcurrentStreams uint16 = 0x3
	SettingInitialWindowSize    uint16 = 0x4
	SettingMaxFrameSize         uint16 = 0x5
	SettingMaxHeaderListSize    uint16 = 0x6
)
