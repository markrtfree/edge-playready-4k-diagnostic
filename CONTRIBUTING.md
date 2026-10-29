# Contributing

1. Open an issue first for behavioral or compatibility changes; keep the change scope small.
2. Provide sanitized browser/OS/GPU versions, Netflix plan tier (not account ID), title 4K availability, extension mode, relevant EME event names, and actual Playing resolution.
3. Do not post cookies, login sessions, ESN, PBCID, Xid, key IDs, license payloads or unredacted debug overlays.
4. Run `npm test` (Node.js 18+). Tests mock EME/MediaCapabilities; if changing the PlayReady/Widevine decision logic, add tests for both supported and unsupported paths.
5. Make errors explicit and keep playback failures reversible. Never add telemetry or broader extension permissions without documenting a compelling reason and obtaining maintainer review.
6. Be precise about evidence: separate site-requested EME string, granted `MediaKeySystemAccess`, actual media binding (if observed), and playback rendition.

Do not submit work intended to extract protected content, steal tokens or circumvent licensing/output protection.
