# Privacy / Data Handling

- The extension is restricted in its manifest to Netflix page URLs. It has no extra permissions, no background worker and no telemetry or upload endpoint.
- A single preference (`netflix-sl3000-mode`) is stored in the Netflix origin's `localStorage` when the mode is changed.
- Each page/frame stores at most 300 **in-memory** diagnostic events. Reloading clears the in-memory event buffer. The `report()` and `export()` APIs expose the local events to the current page's JavaScript; `export()` returns a JSON string and does not initiate a file download or network request.
- The implementation does not intentionally store EME configuration bodies, Netflix account information, playback URLs, DRM license data, keys, cookies, device ESN or session identifiers.
- Because `world: MAIN` exposes hooks and the diagnostics to the webpage environment, this is not a trusted auditing facility and webpage scripts may inspect or alter these data.
- **Before attaching logs or screenshots publicly**, manually remove device identifiers (ESN), PBCID, Xid, account/profile names, personal data, key IDs, tokens and license responses. Do not attach a full HAR capture.
- Review the source before installing. No claims are made regarding future compatibility with the streaming service.
