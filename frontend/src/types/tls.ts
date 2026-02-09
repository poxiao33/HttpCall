export interface TlsPreset {
  id: string
  name: string
  label: string
  ja3: string
  ja4: string
  akamai: string
  description: string
}

export interface TlsConfig {
  preset: string
  customJa3: string
  customJa4: string
  customAkamai: string
}

export interface TlsTemplate {
  id: string
  name: string
  config: TlsConfig
  createdAt: string
}

export const TLS_PRESETS: TlsPreset[] = [
  { id: 'chrome_131', name: 'Chrome 131', label: 'Chrome', ja3: '771,4865-4866-4867-49195-49199...', ja4: 't13d1516h2_8daaf6152771_b0da82dd1658', akamai: '1:65536;2:0;3:1000;4:6291456;6:262144|15663105|0|m,a,s,p', description: 'Windows / macOS' },
  { id: 'firefox_133', name: 'Firefox 133', label: 'Firefox', ja3: '771,4865-4867-4866-49195-49199...', ja4: 't13d1517h2_a09f3c656075_c4f66527b700', akamai: '1:65536;4:131072;5:16384|12517377|3:0:0:201,5:0:0:101,7:0:0:1,9:0:7:1,11:0:3:1,13:0:0:241|m,p,a,s', description: 'Windows / macOS' },
  { id: 'safari_18', name: 'Safari 18', label: 'Safari', ja3: '771,4865-4866-4867-49196-49200...', ja4: 't13d1515h2_5b57614c22b0_3d5d4e203a15', akamai: '4:4194304;3:100|10485760|0|m,s,p,a', description: 'macOS / iOS' },
  { id: 'edge_131', name: 'Edge 131', label: 'Edge', ja3: '771,4865-4866-4867-49195-49199...', ja4: 't13d1516h2_8daaf6152771_b0da82dd1658', akamai: '1:65536;2:0;3:1000;4:6291456;6:262144|15663105|0|m,a,s,p', description: 'Windows' },
  { id: 'ios_18', name: 'iOS 18', label: 'iOS', ja3: '771,4865-4866-4867-49196-49200...', ja4: 't13d1515h2_5b57614c22b0_3d5d4e203a15', akamai: '4:4194304;3:100|10485760|0|m,s,p,a', description: 'iPhone / iPad' },
  { id: 'android_14', name: 'Android 14', label: 'Android', ja3: '771,4865-4866-4867-49195-49199...', ja4: 't13d1516h2_8daaf6152771_e5627efa2ab1', akamai: '1:65536;3:1000;4:6291456|15663105|0|m,a,s,p', description: 'OkHttp' },
  { id: 'custom', name: 'Custom', label: 'Custom', ja3: '', ja4: '', akamai: '', description: '自定义指纹' },
]
