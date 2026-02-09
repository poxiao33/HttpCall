package tls

import (
	utls "github.com/refraction-networking/utls"
)

// GetClientHelloID maps browser preset IDs to utls.ClientHelloID
func GetClientHelloID(presetID string) utls.ClientHelloID {
	switch presetID {
	case "chrome_131":
		return utls.HelloChrome_Auto
	case "firefox_133":
		return utls.HelloFirefox_Auto
	case "safari_18":
		return utls.HelloSafari_Auto
	case "edge_131":
		return utls.HelloEdge_Auto
	case "ios_18":
		return utls.HelloIOS_Auto
	case "android_14":
		return utls.HelloAndroid_11_OkHttp
	default:
		// Default to Chrome if preset not recognized
		return utls.HelloChrome_Auto
	}
}
