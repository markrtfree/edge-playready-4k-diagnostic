# Security Policy

This is an experimental **unpacked browser extension**, not an officially audited or store-reviewed product.

The extension monkey-patches page-visible DRM capability methods. In `prefer` mode, it can deliberately decline Widevine after a limited PlayReady probe. This is not a browser-level DRM capability change, and can break or alter playback behavior. Using page `MAIN` world also means other page code can interact with its exposed diagnostic API.

If you find a security issue, **do not paste DRM licenses, session tokens, device IDs, cookies or unredacted Netflix logs into a public GitHub issue**. Use private GitHub vulnerability reporting if the repository owner enables it, or request a private reporting channel through a minimal public issue without sensitive details.

Only the v0.3.2 source and simulated API boundary tests are provided here. No security guarantee or long-term platform support commitment is made.
