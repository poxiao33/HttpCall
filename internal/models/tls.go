package models

type TlsPreset struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Label       string `json:"label"`
	JA3         string `json:"ja3"`
	JA4         string `json:"ja4"`
	Akamai      string `json:"akamai"`
	Description string `json:"description"`
}

type TlsConfig struct {
	Preset       string `json:"preset"`
	CustomJA3    string `json:"customJa3"`
	CustomJA4    string `json:"customJa4"`
	CustomAkamai string `json:"customAkamai"`
}
