# Netflix 4K / Edge PlayReady EME negotiation: field report

**Date:** 2026-10-30 · **Platform:** Windows 11 Pro 26300.9711, Edge 156, NVIDIA RTX 4060, 4K/60Hz display, HEVC installed. **Status:** Correlated on/off/on playback difference and successful 4K HDR10 observation; root cause and long-term reliability unverified.

## Summary

The Edge GPU report showed hardware-accelerated video decode, HEVC 4K/HDR10 capability, HDCP 2.2 support and hardware PlayReady not disabled, yet one Netflix title initially played at 1080p. The site requested `com.microsoft.playready.recommendation.2000`. An experimental extension upgraded PlayReady EME/MediaCapabilities requests to `.recommendation.3000` and optionally preferred PlayReady over Widevine. A v0.2 on/off/on comparison of **the same title (MovieId 80114792)** correlated with a change from 2160p (8930 kbps, 2160 key usable) to 1080p (1348 kbps, 2160 key absent), then back to 2160p.

On v0.3.2, the script observed a **site request for `.2000` and a browser grant for `.3000`**. In the same observed session, Netflix was playing **3840×2160 HEVC HDR10, 12540 kbps, 23.976 fps**, with a usable 2160 key. Netflix's own debug overlay still showed `.2000`.

These are separate observations: EME access granted is **not** proof of the `MediaKeys` attached to the playing video or the actual CDM security level; actual resolution is proven by the video bitrate/resolution diagnostic, not by a security-level label alone. The extension does not modify a license or output protection requirement.

## Sanitized evidence

| Experiment | Title | Plugin | Video | Playback keySystem in overlay | Reported key tiers |
|---|---|---|---|---|---|
| A | 80114792 | v0.2 on | 2160p HEVC SDR / 8930 kbps | `.2000` | 540,1080,2160 usable |
| B | 80114792 | off | 1080p HEVC SDR / 1348 kbps | `.2000` | 540,1080 usable |
| C | 80114792 | v0.2 on again | 2160p HEVC SDR / 8930 kbps | `.2000` | 540,1080,2160 usable |
| D | 81946382 | v0.3.2 prefer | 2160p HEVC HDR10 / 12540 kbps | `.2000` | 540,1080,2160 usable |

Recorded v0.3.2 event fragment (anonymized):

```json
{"event":"EME-request","keySystem":"com.microsoft.playready.recommendation.2000"}
{"event":"EME-granted","requested":"com.microsoft.playready.recommendation.2000","actual":"com.microsoft.playready.recommendation.3000"}
```

A separate v0.2 refresh had the site choose Widevine and then reported 1080p AVC; there is **no evidence that PlayReady failed first and caused that choice**. The Chrome comparison in the source report used a different 1080p-limited account, so it is **not** a controlled browser comparison. A paused snapshot and limited sample size also constrain the strength of the A/B inference.

## How the extension works

Manifest V3 MAIN-world `document_start` hooks wrap `requestMediaKeySystemAccess` and `MediaCapabilities.decodingInfo`. The PlayReady base/`.2000` request is redirected to `.3000` when possible; a failed upgraded request can fall back to original configuration. `prefer` optionally declines a Widevine request *only after* a native, time-bounded PlayReady hardware probe returns success. That deliberate decline may break playback; `compatible` does not decline Widevine. No license interception, DRM removal or subscription bypass is implemented.

## Confirmed / not confirmed

**Confirmed:** requested/granted EME strings differ after injection; one real playback session was 4K HDR10; on/off/on correlated with 2160 tier availability on one title; 13 mocked API-boundary tests pass.

**Unconfirmed:** why the site requests `.2000`, what PlayReady CDM is ultimately attached, whether any streaming-provider internal entitlement rules changed, whether Edge/Netflix has a specific upstream defect, and robustness across restarts/episodes. Further controlled experiments and logs are required.

## Community and technical references

- Microsoft: https://learn.microsoft.com/en-us/playready/overview/key-system-strings
- PlayReady security levels: https://learn.microsoft.com/en-us/playready/overview/security-level
- Dolby DRM recommendations: https://professionalsupport.dolby.com/s/article/DRM-Guidelines-for-Dolby-Content
- Similar but independent report: https://greasyfork.org/en/scripts/444125-netflix-uhd/discussions/242274
- Chromium Windows PlayReady SL3000 transition: https://chromium.googlesource.com/chromium/src/%2B/ea1b3b85f6f7d729e484568979294afc1b1249a4

## Reproduction proposal

Use the **same Premium account, title, browser version, display setup and network**; randomly alternate off / compatible / prefer, fully restart the Netflix playback session each time, and record actual Playing resolution, key tier status, EME request/grant and errors. Add EME-only vs MC-only experimental variants to identify which API affects rendition selection. Redact ESN, Xid, PBCID, key IDs, license traffic, cookies and URLs before posting.
