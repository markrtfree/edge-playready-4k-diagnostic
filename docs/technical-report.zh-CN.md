# Netflix / Edge 4K、PlayReady 协商异常：技术排障报告

**报告日期**：2026-10-30（UTC+08:00）  
**状态**：已观察到可重复的插件开关差异；v0.3.2 当前会话获得 4K HDR10；根因、长期稳定性仍未确定。  
**用途**：GitHub 公开 issue / 开源项目说明。**所有设备与会话识别符均不随本报告发布。**

## 1. 摘要

在 Windows 11 + Microsoft Edge 156 + RTX 4060 + 4K/60Hz 显示设备上，Netflix 初始对特定影片仅给出 1080P HEVC；网页/调试浮层出现 PlayReady `.2000`，而浏览器 GPU 检测报告 HEVC 4K、HDR10、HDCP 2.2、硬件 DRM 未禁用。实验性扩展通过包装 EME / MediaCapabilities 接口，尝试升级 PlayReady 请求到 `.3000` 并优先选择 PlayReady。插件 v0.2 的同片开关对照中，启用时获得 2160P 视频档位，关闭时退回 1080P，再启用恢复 4K。v0.3.2 的同页诊断进一步记录**网页发起 `.2000`，实际获准 `.3000`**，同时真实播放达到 **3840×2160、HEVC HDR10、12540 kbps**。但 Netflix 浮层继续显示 `.2000`。上述事实不证明 Netflix 或 Edge 存在某个特定代码缺陷，也不证明最终绑定的 CDM 安全级别。

## 2. 测试环境（已脱敏）

| 项目 | 记录 |
|---|---|
| 操作系统 | Windows 11 专业版，Build 26300.9711 / 26H2 |
| 浏览器 | Microsoft Edge 156.0.4314.50（前期 GPU 报告）；播放 UA 为 Edg/156.0.0.0 |
| 显卡 | NVIDIA RTX 4060；前期 32.0.16.1088，后期 32.0.16.2101 |
| 集成显卡 | Intel UHD Graphics 730；非当前活动显示输出 |
| 显示器 | 27M2U-D；3840×2160，60Hz，DisplayPort |
| HEVC 扩展 | Microsoft.HEVCVideoExtension 2.5.48.0 |
| Edge GPU 检测 | Video Decode=Hardware accelerated；HEVC 4K=true；HEVC HDR10=true；HDCP 2.2=true；PlayReady Hardware DRM disabled=false |
| 虚拟显示适配器 | 存在 GameViewer / Virtual Desktop / Meta 驱动，但没有证据说明它们正在提供活动显示输出 |
| 测试内容 | MovieId 80114792（同片对照，HEVC SDR）；81946382（额外 4K HDR10 验证） |

说明：GPU 页面报告的是浏览器可见能力，不等于每次许可证协商都会成功。Windows 缩放 200% 导致逻辑桌面 1920×1080，并非实际面板只有 1080P。此前 Chrome 比较使用了**不同套餐上限的账号**，不能据此直接对照 Netflix 对 Edge / Chrome 的选择。

## 3. 本机关键证据

### 3.1 插件 v0.2，同片对照 `MovieId 80114792`

| 场景 | 实际画面 | 视频码率 | Netflix 浮层 KeySystem | KeyStatus 档位 |
|---|---|---:|---|---|
| 启用 v0.2 | 3840×2160 / HEVC SDR | 8930 kbps | `.2000` | `540,1080,2160` 均 usable |
| 关闭 v0.2 | 1920×1080 / HEVC SDR | 1348 kbps | `.2000` | `540,1080` 均 usable |
| 再次启用 v0.2 | 3840×2160 / HEVC SDR | 8930 kbps | `.2000` | `540,1080,2160` 均 usable |

这是一次 On → Off → On 关联测试，且中间启用快照有 `Rendering state: Paused`；不能当作充分控制变量的长时间压测，也未证明扩展单个拦截点就是根因。

### 3.2 v0.2 额外影片 `MovieId 81946382`

实际显示 `3840×2160`、HEVC HDR10、12540 kbps、23.976 fps；许可证列表包含 2160 / usable，Netflix 浮层显示 `.2000`，说明**浮层字符串不能被简单等同于「只能 1080P」**。

### 3.3 v0.3.2 本机实际会话（2026-10-29T20:58:26Z）

脱敏后的本地诊断事件：

```json
[
  {"time":"2026-10-29T20:58:25.558Z","event":"installed","mode":"prefer","version":"0.3.2"},
  {"time":"2026-10-29T20:58:26.043Z","event":"EME-request","id":1,"keySystem":"com.microsoft.playready.recommendation.2000"},
  {"time":"2026-10-29T20:58:26.045Z","event":"EME-granted","id":1,"requested":"com.microsoft.playready.recommendation.2000","actual":"com.microsoft.playready.recommendation.3000"}
]
```

同一标签页播放器记录：

```text
Rendering state: Playing
Playing bitrate (a/v): 192 / 12540 (3840x2160)
Video Track: HEVC, HDR10
Video Tags: CE4_HDR10_DO_v1, MCCLEAREN_HDR10
KeySystem (Netflix overlay): com.microsoft.playready.recommendation.2000
KeyStatus: 540,1080,2160, usable,usable,usable
Total Frames: 1432
Total Dropped Frames: 0
```

`EME-granted` 只证明浏览器授予指定的 EME Access。没有追踪 `MediaKeys` 到 video 的绑定、许可证要求或底层 CDM 的硬件证明。Netflix 浮层可能沿用网站内部原始配置标签，但这只是解释假设；不能假定它必然是显示缓存或 Netflix 错误。

### 3.4 不稳定路径：一次刷新后选到 Widevine

前次现场记录显示，v0.2 一次刷新重新加载后，网站请求并获得 Widevine，并显示 1080P AVC、HDR 关闭。**没有观察到 PlayReady 先失败再自动回退 Widevine 的直接证据。** v0.2 对 Widevine 默认不干预；v0.3.2 的 `prefer` 模式增加有条件的策略拒绝 Widevine，而非破解/伪造 DRM 能力。

## 4. 扩展实现边界

- 仅 Netflix 页面、Manifest V3 MAIN world、document_start；拦截 EME 和 MediaCapabilities API 调用。
- 对 PlayReady 基础或显式 `.2000` 的请求，尝试交给浏览器的 `.3000` Key System；只升级请求中显式值为 `2000` 的 robustness；原生 NotSupportedError 可回退原配置。
- `prefer` 模式对 Widevine 做一次原生 AVC/SL3000 能力探测（1500ms 截止），探测通过时主动拒绝 Widevine，**这是扩展主动策略**。Netflix 不一定尝试替代 DRM，可能播放失败。
- `compatible` 模式不拒绝 Widevine；只做 PlayReady 升级尝试及回退。
- 不修改许可证、帐号、HDCP/DRM 证书，不伪造 KeyStatus、视频码率或订阅权益。
- 当前页面仅保留最多 300 条事件；模式保存在 Netflix 同源 localStorage；无日志网络上传功能。MAIN world 日志不可视为可信审计；其他脚本可能干预。

## 5. 官方背景及社区相关记录（独立于本机实测）

- 微软官方文档列出 Edge EME 的 `com.microsoft.playready.recommendation`（SL2000）与 `.recommendation.3000`（具备所需硬件时支持 SL3000）；**未将显式 `.2000` 列为标准支持项**，故 Netflix 请求 `.2000` 的浏览器行为需要实测，不能外推所有版本。
- PlayReady SL3000 代表硬件保护，SL2000 并不天然绑定 1080P 分辨率；许可证与服务提供商策略决定实际开放的清晰度。
- Dolby 官方指南显示 Edge 可在特定格式/授权条件下使用两种安全等级、Chrome Windows PlayReady 使用硬件安全路径。
- Greasy Fork (2024-05) 有用户反馈 Netflix UHD 脚本更新使 Edge PlayReady 从 3000 变为 2000、降为 1080P；作者报告随后修复。**是相似症状，不是本案根因证明。**
- Chromium 2026 年变更记录讨论 Windows 上直接 PlayReady SL3000 播放路径，提示 Chrome 与 Edge 的实现策略不同。

文档：
1. https://learn.microsoft.com/en-us/playready/overview/key-system-strings
2. https://learn.microsoft.com/en-us/playready/overview/security-level
3. https://professionalsupport.dolby.com/s/article/DRM-Guidelines-for-Dolby-Content
4. https://greasyfork.org/en/scripts/444125-netflix-uhd/discussions/242274
5. https://chromium.googlesource.com/chromium/src/%2B/ea1b3b85f6f7d729e484568979294afc1b1249a4

## 6. 当前结论与待证实假设

**已证实：**本机具备硬件解码能力；当前 v0.3.2 运行，网页 EME 调用在扩展介入后从 `.2000` 变为实际获准的 `.3000`；有真实 4K HDR10 正在播放；同一影片存在插件 On/Off 时 2160P 授权/分辨率不同的关联现象。

**未证实：**Netflix 为什么优先请求 `.2000`；Netflix 是否主动依据 EME 能力判定可用档位；是否是 Edge 错误、Netflix 的 A/B 实验/功能探测、CDM 兼容性或缓存；实际绑定的视频 CDM 是否 SL3000；跨刷新、换集、重启、睡眠唤醒后的成功率。

## 7. 后续实验设计

建议在**同账号、同影片、同浏览器版本、同屏幕连接与网络条件**下，随机或交替进行多轮插件 `off` / `compatible` / `prefer` 测试。每轮关闭旧页面并建立新会话；记录播放 2–3 分钟后的实际分辨率、KeySystem 字符串、可用视频密钥档位、EME-request/granted、MC-request/result、Widevine policy-decline 和播放错误。另可拆为 EME-only / MediaCapabilities-only 对照，进一步定位触发 4K 的接口路径。避免收集授权令牌或许可证；公开时仅使用脱敏日志。

## 8. 可复现步骤（给 Edge / Netflix 维护者）

1. 在满足 Netflix 4K 要求的 Windows 11 + Edge 上，确认 `edge://gpu` 的 HEVC 4K、HDR10、HDCP 2.2 与硬件解码能力。
2. 使用相同 Premium 账号与支持 4K 的 Netflix 影片测试，无插件时读取 `Ctrl+Alt+Shift+D` 诊断浮层。
3. 在 `edge://extensions` 加载项目根目录，选择 `prefer`，新建 Netflix 标签页播放同一影片并再次读取浮层。
4. 将 `NetflixSL3000.report()` 导出为脱敏文本，比较原始 EME KeySystem、实际 EME grant、KeyStatus、码率及分辨率。
5. 禁用扩展并建立新会话，观察 2160P 是否再次消失；重复多轮，并记录所有失败样本。

**注意**：这是诊断/兼容性项目，不是未授权内容提取工具或播放质量保证。建议在提交 issue 前遵循 Netflix 服务条款和所在地法律规定。
