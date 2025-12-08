BlumbOS Proxy
==============

This proxy allows BlumbBrowser to embed external websites by fetching them server-side and removing/adjusting security headers that prevent embedding (like X-Frame-Options and CSP). This is intended for local testing only.

WARNING: Using a proxy to strip security headers can expose you to security risks. Do not run this proxy in production or publicly accessible environments.

Requirements
------------
- Node.js (14+ recommended)

Install & Run
-------------
```bash
cd d:\WORK\BlumbOS
npm install
npm start
```

Proxy usage
-----------
- Start the proxy (it listens on port 8080 by default)
- In BlumbBrowser, when you click "Open via proxy", it will load:
  `http://localhost:8080/proxy?url={encoded_target_url}`

Notes & Limitations
-------------------
- Some sites rely on same-origin cookies, OAuth flows, or JavaScript that assumes the original origin; these may not work correctly through the proxy.
- Media-heavy or streaming sites may break due to cross-origin restrictions.
- The proxy removes security headers like `X-Frame-Options` and `Content-Security-Policy` for the response, allowing the page to be embedded — use with caution.
- Use this only for local testing and development.

If you want, I can add a button in `BlumbOS.html` that attempts to open the current URL via the proxy automatically when available.
