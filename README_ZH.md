# Cap 中文说明

<p align="center">
	<img width="150" height="150" src="https://github.com/CapSoftware/Cap/blob/main/apps/desktop/src-tauri/icons/Square310x310Logo.png" alt="Cap logo">
</p>

<h1 align="center">Cap</h1>

<p align="center">
	开源、快速、可分享的屏幕录制工具，适合希望掌控数据和工作流的个人与团队。
</p>

<p align="center">
	<a href="https://cap.so">官网</a>
	 |
	<a href="https://cap.so/download">下载</a>
	 |
	<a href="https://cap.so/docs">文档</a>
	 |
	<a href="https://cap.so/pricing">价格</a>
	 |
	<a href="https://cap.link/discord">Discord</a>
</p>

Cap 是 Loom 的开源替代方案。它支持屏幕录制、本地编辑、即时分享链接、评论、转录、数据分析、团队空间、自定义域名、自定义 S3 存储，以及在需要完整控制时进行自托管部署。

Cap 适用于产品演示、Bug 反馈、入职培训、教程录制、设计评审、工程 walkthrough、异步站会、客户更新，以及任何“录一段比开会更快”的场景。

## 主要特性

- **录制、编辑、分享。** 捕获屏幕、摄像头和麦克风，然后分享链接或导出视频文件。
- **即时模式。** 录制时同步上传，停止录制后即可获得分享链接。
- **工作室模式。** 本地高质量录制，支持背景、缩放、裁剪、字幕和导出设置。
- **桌面应用。** 支持 macOS 和 Windows，并提供 Web 仪表盘用于查看、分享和管理录制。
- **数据自主。** 可使用 Cap Cloud，也可以连接自己的 S3 兼容存储，或完整自托管。
- **隐私优先。** 支持公开/私密分享、密码保护、自定义域名，也可以让敏感录制只保存在本地。
- **异步协作。** 评论、反应、转录、观看分析和团队空间让反馈始终跟随视频。
- **AI 能力。** 可自动生成标题、摘要、章节、字幕和转录。

## 中英文切换

桌面端 App 已支持中文和英文切换。

操作路径：

1. 打开 Cap 桌面端。
2. 进入 `设置 -> 通用`。
3. 找到 `语言` 区域。
4. 点击 `English` 切换到英文。
5. 点击 `中文` 切换回中文。

切换后，设置侧栏、通用设置页、登录按钮、错误页等已接入国际化的界面会立即刷新。语言选择会保存在当前设备上，下次启动 App 时会自动恢复。

如果需要快速验证语言持久化，可以在 WebView DevTools Console 中执行：

```js
localStorage.getItem("language");
```

返回值说明：

| 返回值 | 当前语言 |
| --- | --- |
| `"zh"` | 中文 |
| `"en"` | 英文 |

也可以手动设置语言后刷新页面：

```js
localStorage.setItem("language", "en");
location.reload();
```

## 录制模式

| 模式 | 适合场景 | 工作方式 |
| --- | --- | --- |
| 即时模式 | 快速反馈、Bug 反馈、异步更新 | Cap 会边录边上传，录制结束后立即生成分享链接。 |
| 工作室模式 | 产品演示、教程、发布内容、客户交付 | Cap 会本地录制并打开编辑器，可编辑后导出或分享。 |

## 数据所有权

Cap 面向不希望录制工作流被锁在黑盒服务里的用户和团队。

- 可以使用 Cap Cloud 获得最快的托管体验。
- 可以连接 AWS S3、Cloudflare R2、Backblaze B2、MinIO、Wasabi 或其他 S3 兼容服务。
- 可以使用自己的域名提供分享页面。
- 可以用 Docker Compose 自托管 Cap Web、API、数据库、媒体服务和对象存储。
- 可以在桌面端 `设置 -> Cap Server URL` 中指向自托管实例。

## 快速开始

普通用户推荐流程：

1. 从 [cap.so/download](https://cap.so/download) 下载 macOS 或 Windows 版本。
2. 登录或创建账户。
3. 选择即时模式或工作室模式。
4. 开始录制第一个 Cap。
5. 分享链接、导出文件，或保存在本地。

完整产品文档见 [cap.so/docs](https://cap.so/docs)。

## 自托管

最快的自托管方式是 Docker Compose：

```bash
git clone https://github.com/CapSoftware/Cap.git
cd Cap
docker compose up -d
```

启动后，Cap Web 默认可通过以下地址访问：

```text
http://localhost:3000
```

如果没有配置邮件服务，登录链接会出现在服务日志中：

```bash
docker compose logs cap-web
```

生产环境部署前，请配置公网 URL，并替换默认密钥：

```bash
CAP_URL=https://cap.yourdomain.com
S3_PUBLIC_URL=https://s3.yourdomain.com
```

更多邮件、AI 服务、SSL、存储、生产加固和排错内容见 [自托管文档](https://cap.so/docs/self-hosting)。

## 本地开发

Cap 是一个 Turborepo monorepo，主要技术栈包括 Rust、TypeScript、Tauri、SolidStart、Next.js、Drizzle、MySQL、Tailwind CSS 和共享媒体处理 crates。

环境要求：

- Node.js 20 或更高版本
- pnpm 10.5.2
- Rust 1.88 或更高版本
- Docker，用于 MySQL、MinIO 和本地服务

安装依赖并初始化：

```bash
pnpm install
pnpm env-setup
pnpm cap-setup
```

常用命令：

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动完整本地开发栈 |
| `pnpm dev:web` | 只启动 Web 应用 |
| `pnpm dev:desktop` | 启动桌面应用 |
| `pnpm build` | 构建整个 workspace |
| `pnpm tauri:build` | 构建桌面端 release |
| `pnpm lint` | 运行 Biome lint |
| `pnpm format` | 使用 Biome 格式化 |
| `pnpm typecheck` | 运行 TypeScript 类型检查 |
| `cargo test -p <crate>` | 运行指定 Rust crate 的测试 |

数据库命令：

| 命令 | 用途 |
| --- | --- |
| `pnpm db:generate` | 生成数据库相关产物 |
| `pnpm db:push` | 推送 schema 变更 |
| `pnpm db:studio` | 打开 Drizzle Studio |

## 桌面端调试

完整调试桌面端推荐使用 Tauri dev 流程：

```powershell
cd apps/desktop
pnpm tauri dev
```

如果需要打开 WebView2 远程调试端口：

```powershell
cd apps/desktop
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9222"
pnpm tauri dev
```

然后在浏览器访问：

```text
http://localhost:9222
```

如果要验证 release exe，可先构建 no-bundle 版本：

```powershell
pnpm --filter @cap/desktop tauri build --no-bundle
```

再运行：

```powershell
.\target\release\Cap-CN.exe
```

## 仓库结构

| 路径 | 内容 |
| --- | --- |
| `apps/desktop` | Tauri v2 桌面端，包含 SolidStart UI 和 Rust 后端 |
| `apps/web` | Next.js Web 应用，包含营销页、文档、仪表盘、分享页、API routes 和认证 |
| `apps/cli` | Rust CLI |
| `apps/media-server` | Web 应用使用的媒体处理服务 |
| `apps/discord-bot` | Discord 集成 |
| `packages/database` | Drizzle schema 和数据库访问 |
| `packages/ui` | 共享 React UI |
| `packages/ui-solid` | 共享 Solid UI |
| `packages/web-backend` | 后端服务层 |
| `packages/web-domain` | Web 领域模型和类型 |
| `packages/env` | 环境变量校验 |
| `packages/sdk-embed` | Embed SDK |
| `packages/sdk-recorder` | Recorder SDK |
| `crates/*` | 录制、捕获、摄像头、音频、编码、渲染、mux、导出和测试相关 Rust crates |
| `scripts/*` | 初始化、分析、构建和维护脚本 |
| `infra/*` | 基础设施配置 |

## 贡献

Cap 是公开开发的项目，欢迎提交 issue、pull request、设计反馈、Bug 报告和文档修复。

- 提交 PR 前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 可以加入 [Discord](https://cap.link/discord) 社区。
- 可以在 [Algora](https://console.algora.io/org/CapSoftware/bounties?status=open) 查看开放 bounty。

## 许可证

本软件的部分内容采用不同许可证：

- `cap-camera*` 和 `scap-*` crate 系列使用 MIT License。见 [licenses/LICENSE-MIT](https://github.com/CapSoftware/Cap/blob/main/licenses/LICENSE-MIT)。
- 第三方组件遵循其原作者提供的许可证。
- 未特别说明的其他内容遵循 [LICENSE](https://github.com/CapSoftware/Cap/blob/main/LICENSE) 中定义的 AGPLv3。
