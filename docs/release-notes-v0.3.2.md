# v0.3.2 — experimental public source release

First public source packaging of the locally tested v0.3.2 script.

- PlayReady base/explicit `.2000` upgrade attempts to `.3000` in EME and MediaCapabilities; original configuration fallback on unsupported upgrades.
- `prefer` and `compatible` modes. `prefer` optionally declines Widevine only after a bounded hardware PlayReady probe; this is not a browser hardware limitation.
- Local capped diagnostics and on-demand overlay (hidden by default); no license interception or network telemetry.
- 13 Node.js mocked API tests pass. One real session observed 4K HEVC HDR10 and granted `.3000` EME access; service behavior on repeated refreshes is not yet established.

**Risks:** playback errors, 1080p fallback, future Netflix incompatibility, false conclusions from `.2000` label. If needed, switch to compatible mode or disable extension.
