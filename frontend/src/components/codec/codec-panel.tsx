import { useState } from 'react';
import { Eraser } from 'lucide-react';

export function CodecPanel() {
  const [input, setInput] = useState('aHR0cHM6Ly9hcGkuZXhhbXBsZS5jb20vdXNlcnM=');
  const [output, setOutput] = useState('');
  const [operationChain, setOperationChain] = useState<string[]>([]);

  const handleOperation = (operation: string, fn: (input: string) => string) => {
    try {
      const result = fn(input);
      setOutput(result);
      setInput(result);
      setOperationChain([...operationChain, operation]);
    } catch (error) {
      setOutput(`错误: ${error instanceof Error ? error.message : '操作失败'}`);
    }
  };

  const clearChain = () => {
    setOperationChain([]);
    setOutput('');
  };

  const urlEncode = (str: string) => encodeURIComponent(str);
  const urlDecode = (str: string) => decodeURIComponent(str);
  const base64Encode = (str: string) => btoa(unescape(encodeURIComponent(str)));
  const base64Decode = (str: string) => decodeURIComponent(escape(atob(str)));

  const unicodeEncode = (str: string) => {
    return str.split('').map(char => {
      const code = char.charCodeAt(0);
      return code > 127 ? `\\u${code.toString(16).padStart(4, '0')}` : char;
    }).join('');
  };

  const unicodeDecode = (str: string) => {
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
  };

  const hexEncode = (str: string) => {
    return str.split('').map(char =>
      char.charCodeAt(0).toString(16).padStart(2, '0')
    ).join('');
  };

  const hexDecode = (str: string) => {
    const hex = str.replace(/\s/g, '');
    if (hex.length % 2 !== 0) throw new Error('无效的十六进制字符串');
    const pairs = hex.match(/.{1,2}/g) || [];
    return pairs.map(byte => String.fromCharCode(parseInt(byte, 16))).join('');
  };

  const hashSHA256 = async (str: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const hashSHA512 = async (str: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleAsyncOperation = async (operation: string, fn: (input: string) => Promise<string>) => {
    try {
      const result = await fn(input);
      setOutput(result);
      setOperationChain([...operationChain, operation]);
    } catch (error) {
      setOutput(`错误: ${error instanceof Error ? error.message : '操作失败'}`);
    }
  };

  const jsonFormat = (str: string) => JSON.stringify(JSON.parse(str), null, 2);
  const jsonMinify = (str: string) => JSON.stringify(JSON.parse(str));

  const timestampConvert = (str: string) => {
    const trimmed = str.trim();
    if (/^\d+$/.test(trimmed)) {
      const timestamp = parseInt(trimmed, 10);
      return new Date(timestamp).toISOString();
    }
    const date = new Date(trimmed);
    if (isNaN(date.getTime())) throw new Error('无效的日期或时间戳');
    return date.getTime().toString();
  };

  const generateUUID = () => crypto.randomUUID();
  const generateRandomString = () => {
    return Array.from({ length: 3 }, () => Math.random().toString(36).slice(2)).join('').slice(0, 16);
  };

  const buttonClass = 'px-2 py-1 text-[11px] rounded-md text-text-tertiary hover:bg-bg-hover hover:text-text-secondary transition-colors';
  const sectionHeaderClass = 'text-[11px] uppercase text-text-tertiary font-medium mb-1.5 mt-3 first:mt-0 tracking-wider';

  return (
    <div className="flex h-full">
      {/* Left: Input */}
      <div className="flex flex-col flex-1 min-w-0 bg-bg-primary">
        <div className="px-3 py-2.5 text-[12px] text-text-secondary font-semibold bg-bg-secondary uppercase tracking-wider">输入</div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-3 text-[13px] bg-bg-primary resize-none text-text-primary font-mono outline-none"
          placeholder="输入文本..."
        />
        <div className="px-3 py-2 text-[10px] text-text-tertiary bg-bg-secondary">
          {input.length} 字符
        </div>
      </div>

      {/* Center: Operations */}
      <div className="w-[200px] shrink-0 overflow-y-auto p-3 bg-bg-secondary">
        <div className={sectionHeaderClass}>编码</div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => handleOperation('URL编码', urlEncode)} className={buttonClass}>URL编码</button>
          <button onClick={() => handleOperation('URL解码', urlDecode)} className={buttonClass}>URL解码</button>
          <button onClick={() => handleOperation('Base64编码', base64Encode)} className={buttonClass}>Base64编码</button>
          <button onClick={() => handleOperation('Base64解码', base64Decode)} className={buttonClass}>Base64解码</button>
          <button onClick={() => handleOperation('Unicode编码', unicodeEncode)} className={buttonClass}>Unicode编码</button>
          <button onClick={() => handleOperation('Unicode解码', unicodeDecode)} className={buttonClass}>Unicode解码</button>
          <button onClick={() => handleOperation('Hex编码', hexEncode)} className={buttonClass}>Hex编码</button>
          <button onClick={() => handleOperation('Hex解码', hexDecode)} className={buttonClass}>Hex解码</button>
        </div>

        <div className={sectionHeaderClass}>哈希</div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => handleOperation('MD5', () => '暂不支持 MD5')} className={buttonClass}>MD5</button>
          <button onClick={() => handleOperation('SHA1', () => '暂不支持 SHA1')} className={buttonClass}>SHA1</button>
          <button onClick={() => handleAsyncOperation('SHA256', hashSHA256)} className={buttonClass}>SHA256</button>
          <button onClick={() => handleAsyncOperation('SHA512', hashSHA512)} className={buttonClass}>SHA512</button>
          <button onClick={() => handleOperation('HMAC-SHA256', () => '暂不支持 HMAC-SHA256')} className={buttonClass}>HMAC-SHA256</button>
        </div>

        <div className={sectionHeaderClass}>格式</div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => handleOperation('JSON格式化', jsonFormat)} className={buttonClass}>JSON格式化</button>
          <button onClick={() => handleOperation('JSON压缩', jsonMinify)} className={buttonClass}>JSON压缩</button>
          <button onClick={() => handleOperation('时间戳转换', timestampConvert)} className={buttonClass}>时间戳转换</button>
        </div>

        <div className={sectionHeaderClass}>生成</div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => { setOutput(generateUUID()); setOperationChain([...operationChain, 'UUID']); }} className={buttonClass}>UUID</button>
          <button onClick={() => { setOutput(generateRandomString()); setOperationChain([...operationChain, '随机字符串']); }} className={buttonClass}>随机字符串</button>
        </div>

        {operationChain.length > 0 && (
          <div className="mt-4 pt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase text-text-tertiary font-medium tracking-wider">操作链</span>
              <button
                onClick={clearChain}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-text-tertiary hover:text-text-secondary rounded-md hover:bg-bg-hover transition-colors"
              >
                <Eraser size={12} />
                清除
              </button>
            </div>
            <div className="text-[11px] text-text-tertiary font-mono selectable-content">
              {operationChain.join(' → ')}
            </div>
          </div>
        )}
      </div>

      {/* Right: Output */}
      <div className="flex flex-col flex-1 min-w-0 bg-bg-primary">
        <div className="px-3 py-2.5 text-[12px] text-text-secondary font-semibold bg-bg-secondary uppercase tracking-wider">输出</div>
        <textarea
          value={output}
          readOnly
          className="flex-1 p-3 text-[13px] bg-bg-primary resize-none text-text-primary font-mono outline-none"
          placeholder="输出结果..."
        />
        <div className="px-3 py-2 text-[10px] text-text-tertiary bg-bg-secondary">
          {output.length} 字符
        </div>
      </div>
    </div>
  );
}