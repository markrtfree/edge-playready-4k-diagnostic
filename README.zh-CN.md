# Edge PlayReady 4K Diagnostic（中文）

一个**非官方、实验性**的 Microsoft Edge 扩展，用于排查 Netflix 在 Windows 上的 PlayReady 协商与 4K/HDR 播放问题。当前版本 **v0.3.2**。技术证据见 [完整报告](docs/technical-report.zh-CN.md)，英文首页见 [README.md](README.md)。

> **重要说明**：本项目不能绕过 Netflix 套餐、许可证、HDCP、硬件安全要求，也不保证强制 4K。它调整网页侧的 DRM 能力协商，可能导致播放失败。与 Netflix、微软和 Google 无官方关联。

## 本机实测发现

同一部作品 `MovieId 80114792` 的 v0.2 插件测试呈现：启用时可播放 **3840×2160 HEVC SDR**（视频 8930 kbps，2160 密钥为 `usable`），关闭时回到 **1920×1080**（1348 kbps，未出现 2160 档位），再次启用恢复 4K。随后 v0.3.2 的实时事件记录，网页原始 EME 请求为 `...recommendation.2000`、浏览器实际授予 `...recommendation.3000`；播放器正在播放 **3840×2160 HEVC HDR10**（12540 kbps）。Netflix 原始调试浮层仍显示 `.2000`，此字段**不能单独证明底层最终安全等级**。尚未找到根因或保证每次刷新都成功的办法。

## 安装

1. 下载或克隆仓库，在 Edge 打开 `edge://extensions`。
2. 启用「开发人员模式」→「加载解压缩的扩展」，选择包含 `manifest.json` 的**仓库根目录**。
3. 禁用 v0.1 / v0.2 等旧版与其他 DRM 重写扩展，以免重复注入。
4. 关闭已有 Netflix 标签页，重新打开 Netflix。确保账号、影片、显示器与 HDCP 都符合 4K 条件。
5. 播放后按 `Ctrl + Alt + Shift + D`，以 `Playing bitrate` 和括号内分辨率判断是否真正播放 4K。只看 KeySystem `.3000` 不够。

## 模式与控制台

在 Netflix 页面打开开发者工具 Console：

```js
NetflixSL3000.setMode('prefer')      // 默认：优先 PlayReady；可能使播放失败
NetflixSL3000.setMode('compatible')  // 兼容模式：不人为拒绝 Widevine
NetflixSL3000.report()               // 本地诊断结构化对象
NetflixSL3000.export()               // 返回 JSON 字符串，不上传文件
NetflixSL3000.showOverlay(true)      // 按需显示诊断标签
NetflixSL3000.showOverlay(false)     // 关闭标签（默认隐藏）
```

切换模式后须手动刷新页面以创建新的播放会话。若不能播放，先切换 `compatible`，不行则在 `edge://extensions` 禁用扩展、重新打开 Netflix。

## 技术实现与限制

扩展采用 Manifest V3、`document_start`、`MAIN` world，只匹配 Netflix 页面。它包装 `requestMediaKeySystemAccess` 与 `MediaCapabilities.decodingInfo`，尝试把 PlayReady 基础或 `.2000` 请求改为 `.3000`，必要时回退原配置。默认的 `prefer` 模式在原生探测硬件 PlayReady 可用后，会**主动拒绝** Widevine 请求，以尝试促使网页选择 PlayReady；这并不代表浏览器真不支持 Widevine，网站也可能直接报错。`compatible` 模式不会主动拒绝 Widevine。

没有额外扩展权限、没有日志上传接口；仅在 Netflix 同源 localStorage 保存模式，运行中的页面内最多保留 300 条诊断事件，不主动记录 Cookie、令牌、许可证、密钥 ID。由于在页面 MAIN world 运行，诊断结果不是防篡改日志。公开反馈前请手动去除个人和会话标识。

## 测试与发布状态

在 Node.js 模拟的浏览器 API 边界下有 **13 项通过的自动化测试**。这不代表 Netflix、真实许可证、换集、休眠或反复刷新的长期稳定性已经验证。执行 `npm test` 即可重跑测试。当前建议以 GitHub 源码发布为主，尚未提交到 Edge Add-ons 商店。

参考：[微软 EME 文档](https://learn.microsoft.com/zh-cn/playready/overview/key-system-strings) · [PlayReady 安全等级](https://learn.microsoft.com/zh-cn/playready/overview/security-level) · [Dolby DRM 指南](https://professionalsupport.dolby.com/s/article/DRM-Guidelines-for-Dolby-Content) · [社区相关案例](https://greasyfork.org/en/scripts/444125-netflix-uhd/discussions/242274)。

MIT 开源协议见 [LICENSE](LICENSE)，贡献方式见 [CONTRIBUTING.md](CONTRIBUTING.md)。
