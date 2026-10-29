# 部分 Windows 设备在 Edge 播放 Netflix 仅有 1080p：4K HDR 排障与临时解决方案

本项目是非官方、实验性的 Edge 扩展，适用于已具备 Netflix 4K 套餐、兼容设备及显示输出条件，但播放仍受限于 1080p 的用户。它尝试改善 PlayReady DRM 协商；不保证 4K，也不绕过套餐、许可证或 HDCP，可能造成播放失败。

[中文详细说明](README.zh-CN.md) · [技术报告](docs/technical-report.zh-CN.md) · [下载插件 ZIP（Releases）](https://github.com/markrtfree/edge-playready-4k-diagnostic/releases)

安装：下载 Release ZIP 并解压，在 edge://extensions 开启开发人员模式，选择“加载解压缩的扩展”，选中包含 manifest.json 的文件夹。关闭其他 DRM 修改插件后重新打开 Netflix。按 Ctrl+Alt+Shift+D 查看 Playing bitrate 的实际分辨率。

若无法播放，在 Netflix 控制台执行 `NetflixSL3000.setMode('compatible')` 并刷新；仍有问题可禁用扩展。默认 prefer 模式可能主动拒绝 Widevine，Netflix 不一定会切换到 PlayReady。

---

# Edge PlayReady 4K Diagnostic

**Unofficial, experimental Microsoft Edge extension** to investigate PlayReady EME negotiation and Netflix 4K/HDR playback on supported Windows PCs. Current version: **0.3.2**. [简体中文说明](README.zh-CN.md) · [Chinese technical report](docs/technical-report.zh-CN.md) · [English technical report](docs/technical-report.en.md)

> [!WARNING]
> **Not a guaranteed 4K unlock.** This extension changes *page-side DRM capability negotiation*, not subscriptions, DRM licenses, HDCP, keys, or device certificates. It may cause Netflix playback to fail, and streaming services can change their implementation without notice. It is not affiliated with, sponsored by, or endorsed by Netflix, Microsoft, or Google.

## Why this project exists

One Windows 11 / Edge 156 test machine met the GPU, HEVC and HDCP capability checks but initially played selected Netflix content in 1080p. The webpage requested PlayReady `...recommendation.2000`. With the v0.2 experimental extension enabled, an on/off/on comparison on **the same Netflix title** correlated with 2160p availability; with the extension disabled, the title returned to 1080p. A later **v0.3.2** observation captured an incoming `...2000` EME request, a native access grant for `...3000`, and actual **3840×2160 HEVC HDR10** playback.

The Netflix debug overlay still displayed `.2000`. **Do not infer the actual CDM security level from that overlay alone**. `MediaKeySystemAccess` being granted, the `MediaKeys` actually attached to the media element, and the license security level are separate observations. Root cause is not established; the test did not collect licenses or DRM secrets.

## Installation (unpacked)

1. Download or clone this repository. The extension files `manifest.json` and `diagnose-force.js` are in the **repository root**.
2. Open `edge://extensions`, enable **Developer mode**, and choose **Load unpacked**; select the repository root.
3. Disable older copies of this extension and other Netflix DRM rewriting scripts/extensions to avoid collisions.
4. Close all existing Netflix tabs and reopen the site. A browser reload of an existing tab may retain earlier injected state.
5. On an eligible Netflix account and a title known to support 4K, press `Ctrl+Alt+Shift+D` to check **Playing bitrate (a/v)** and actual resolution. Merely displaying `.3000` does **not** prove 4K.

**Requirements:** Windows with compatible hardware, Edge, a compatible 4K display and protected output path, Netflix plan/title/region availability, and normal HEVC support. The extension cannot substitute for these.

## Modes and console diagnostics

Open DevTools Console on a Netflix page. By default this version uses `prefer`. A mode change affects the next playback session only: **refresh/new tab required**.

```js
NetflixSL3000.setMode('prefer')       // Prefer PlayReady: may decline Widevine after a limited probe
NetflixSL3000.setMode('compatible')   // Do not decline Widevine; safer fallback for playback
NetflixSL3000.report()                // Structured local diagnostic data
NetflixSL3000.export()                // JSON string; does NOT upload or download anything
NetflixSL3000.showOverlay(true)      // Manually show diagnostic overlay
NetflixSL3000.showOverlay(false)     // Hide it (hidden by default)
```

### What the extension actually does

- Installs a `document_start`, MAIN-world content script only on matching Netflix pages/frames (Manifest V3).
- Wraps `navigator.requestMediaKeySystemAccess()` and `navigator.mediaCapabilities.decodingInfo()` where accessible.
- Attempts to replace base PlayReady/explicit `.2000` key-system requests with `.recommendation.3000`, upgrading *only* explicit `robustness: '2000'` fields in the requested configurations.
- If hardware PlayReady upgrade is unsupported, EME retries the original request once; MediaCapabilities can retry its original configuration.
- In **prefer** mode, on a Widevine request, performs a native PlayReady SL3000 AVC probe with a 1500 ms bound. If it succeeds, the extension deliberately declines the Widevine path to invite the site to try PlayReady. **This is an extension policy decision, not native browser incapability.** The service may fail instead of trying another DRM path.
- In **compatible** mode, it leaves Widevine intact.

The script does **not** rewrite Netflix's own diagnostic overlay, attach MediaKeys to video, obtain licenses, spoof key status, request a 4K rendition, or guarantee repeated 4K across page refreshes.

## Privacy and safety

- No extra extension permissions; no `background` worker; no telemetry endpoint or network uploader.
- Stores only the selected mode in the Netflix origin's `localStorage`. Per-frame memory holds up to 300 timestamped diagnostic events; reload clears them.
- Does not intentionally record cookies, authorization tokens, ESN/device identifiers, raw license data, key IDs, playback URLs or configuration bodies.
- Runs in **MAIN world**, where page scripts may inspect or interfere with its exposed `window.NetflixSL3000` API. Logs are **not tamper-proof**.
- Never publish unredacted screenshots, Netflix debug overlays or EME license traffic in issue reports. See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## Troubleshooting / rollback

If playback breaks, run `NetflixSL3000.setMode('compatible')` and manually refresh. If that doesn't help, disable the extension in `edge://extensions` and open a new Netflix tab. No registry, drivers or DRM components are modified.

This version has **13 passing Node.js tests** using simulated EME/MediaCapabilities APIs; they are **not** tests of actual Netflix licensing or long-term stability. Run:

```sh
npm test
# or: node --test diagnostic.test.cjs
```

See [docs/technical-report.en.md](docs/technical-report.en.md) for exact observations and evidence limitations. A matching 4K result may still be attributable in part to session, title or adaptive bitrate changes; use repeated controlled comparisons.

## Related references

- [Microsoft PlayReady EME key-system strings](https://learn.microsoft.com/en-us/playready/overview/key-system-strings)
- [Microsoft PlayReady security levels](https://learn.microsoft.com/en-us/playready/overview/security-level)
- [Dolby DRM guidelines](https://professionalsupport.dolby.com/s/article/DRM-Guidelines-for-Dolby-Content)
- [Greasy Fork discussion: Netflix UHD script, Edge 2000 vs 3000](https://greasyfork.org/en/scripts/444125-netflix-uhd/discussions/242274) (independent anecdote; not proof of same defect)
- [Chromium change noting direct PlayReady SL3000 on Windows](https://chromium.googlesource.com/chromium/src/%2B/ea1b3b85f6f7d729e484568979294afc1b1249a4)

## Development and contribution

Contributions and reproducible, *sanitized* test reports are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Licensed under [MIT](LICENSE). Project maintainers/contributors are not affiliated with the streaming provider or DRM vendors.
