---
name: Playback / PlayReady bug
about: Share a reproducible, SANITIZED playback issue
labels: bug
---

**Before posting:** remove ESN, PBCID, Xid, key IDs, tokens, cookies and license data. Never upload a raw HAR capture or full debug overlay.

- OS version/build:
- Edge version:
- GPU / driver:
- Display / connection / HDCP check:
- HEVC installed / 4K capability check:
- Account supports 4K (yes/no/unknown; NO identifiers):
- Video has known 4K availability (yes/no/unknown):
- Extension version and mode (off / compatible / prefer):
- Actual Playing bitrate and resolution:
- Netflix overlay KeySystem (label only):
- Redacted EME request/grant and MC result events:
- Steps to reproduce:
- Observed vs expected:
- Repeatability (N successful / M attempts):

**Caution:** An EME grant for `.3000` does not establish the security level of MediaKeys bound to the playing video.
