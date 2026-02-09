# HttpCall

<div align="center">

** WebApi调试 逆向调试 · 支持 TLS 指纹定制**

专门为web逆向开发的 HTTP 接口调试工具，支持自定义 TLS 指纹、请求和响应参数快速对比、代理等功能。

后续版本会支持接入ai模型打通和浏览器的连接一键提取动态/加密参数生成逻辑的js代码（就是一键抠js代码、补环境等，由ai大模型来自动完成）、Ws、Wss、Js代码调试等，感兴趣的可以加入QQ交流群，版本更新后第一时间在群里发布：1084085651

点击链接加入群聊【HttpCall】：https://qm.qq.com/q/6pe3oJQG7m

</div>

---

## 功能特性

### TLS 指纹
- **浏览器预设** — Chrome、Firefox、Safari、Edge、iOS、Android 指纹一键切换
- **自定义配置** — 密码套件、扩展、ALPN 协议、HTTP/2 设置全部可调
- **指纹分析** — 实时查看 JA3、JA4、Akamai 指纹
- **模板系统** — 保存和复用自定义 TLS 配置

### HTTP 客户端
- **多标签页** — 同时编辑多个请求，支持拖拽排序
- **请求构建** — 参数、请求头、请求体、认证的可视化编辑
- **响应查看** — JSON/XML/HTML 格式化 + 十六进制视图
- **连接追踪** — 查看 TCP 收发包详情（方向、大小、十六进制预览）及耗时瀑布图（DNS → TCP → TLS → TTFB → 下载）
- **重定向追踪** — 查看完整重定向链
- **cURL 导入** — 支持 Unix 和 Windows CMD 两种格式

### 请求对比
- **并排对比** — 不同 TLS 配置的响应差异
- **差异高亮** — 状态码、响应头、响应体逐项对比

### 其他
- **集合管理** — 请求分组、导入导出
- **历史记录** — 自动记录所有已发送请求
- **编解码工具** — Base64、URL、JSON 等常用编解码
- **明暗主题** — 跟随系统自动切换
- **跨平台** — 支持 macOS 和 Windows

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Wails v2 |
| 后端 | Go + utls + 自定义 HTTP/2 |
| 前端 | React 19 + TypeScript |
| 构建 | Vite |
| 状态 | Zustand + Immer |
| 样式 | Tailwind CSS 4 |

## 安装与运行

### 环境要求

- Go 1.21+
- Node.js 18+
- Wails CLI v2.10+ — `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

### 开发模式

```bash
# 安装依赖
go mod download
cd frontend && npm install && cd ..

# 启动开发服务（热重载）
wails dev
```

### 生产构建

```bash
# macOS
wails build

# Windows（在 Windows 上执行）
wails build

# macOS 交叉编译 Windows（需要 Docker 或 mingw）
wails build -platform windows/amd64
```

构建产物在 `build/bin/` 目录。

## 项目结构

```
HttpCall/
├── main.go                     # 入口，Wails 配置
├── app.go                      # Go ↔ 前端绑定方法
├── wails.json                  # Wails 项目配置
├── build/
│   ├── appicon.png             # 应用图标
│   ├── darwin/                 # macOS 构建配置
│   └── windows/                # Windows 构建配置
├── internal/
│   ├── httpclient/             # HTTP 客户端核心
│   ├── tls/                    # TLS 指纹（JA3/JA4）
│   ├── http2/                  # HTTP/2 SETTINGS 帧
│   ├── proxy/                  # 代理支持
│   ├── models/                 # 数据模型
│   └── storage/                # 持久化存储
└── frontend/src/
    ├── components/
    │   ├── layout/             # 布局（标题栏、侧边栏、状态栏）
    │   ├── request/            # 请求编辑器
    │   ├── response/           # 响应查看器
    │   ├── tls/                # TLS 指纹配置
    │   ├── compare/            # 请求对比
    │   ├── codec/              # 编解码工具
    │   ├── curl/               # cURL 导入
    │   ├── history/            # 历史记录
    │   └── shared/             # 通用组件
    ├── stores/                 # Zustand 状态管理
    ├── types/                  # TypeScript 类型
    └── utils/                  # 工具函数（cURL 解析等）
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + Enter` | 发送请求 |
| `Ctrl/Cmd + T` | 新建标签页 |
| `Ctrl/Cmd + W` | 关闭标签页 |
| `Ctrl/Cmd + B` | 切换侧边栏 |

## 许可证

MIT
