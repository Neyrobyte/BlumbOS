const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

// Simple proxy endpoint: /proxy?url={encodedUrl}
app.get('/proxy', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing url parameter');

  let url;
  try { url = new URL(target); } catch (e) { return res.status(400).send('Invalid URL'); }

  try {
    const response = await fetch(url.toString(), { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (BlumbBrowser Proxy)' } });

    // Copy headers except security headers that block embedding
    response.headers.forEach((value, name) => {
      const lname = name.toLowerCase();
      if (lname === 'x-frame-options' || lname === 'content-security-policy' || lname === 'content-security-policy-report-only' || lname === 'x-content-type-options' || lname === 'set-cookie') return;
      try { res.setHeader(name, value); } catch (e) { /* ignore invalid headers */ }
    });

    const contentType = response.headers.get('content-type') || '';

    // If HTML, rewrite base and remove CSP meta tags
    if (contentType.includes('text/html')) {
      let body = await response.text();
      const $ = cheerio.load(body, { decodeEntities: false });

      // Ensure base tag so relative URLs load correctly
      const origin = url.origin;
      if ($('base').length === 0) {
        $('head').prepend(`<base href="${origin}">`);
      } else {
        $('base').attr('href', origin);
      }

      // Remove CSP meta tags
      $('meta[http-equiv]').each((i, el) => {
        const httpEquiv = ($(el).attr('http-equiv') || '').toLowerCase();
        if (httpEquiv.indexOf('content-security-policy') !== -1) $(el).remove();
      });

      // Remove any <script type="application/ld+json">? keep scripts as-is (they will execute from original origin, may break)

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      // Make sure embedding is allowed from our origin
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.send($.html());
      return;
    }

    // Otherwise stream binary content
    const buffer = await response.buffer();
    // set content-type if present
    if (contentType) res.setHeader('Content-Type', contentType);
    res.send(buffer);
  } catch (err) {
    console.error('Proxy error:', err && err.message);
    res.status(500).send('Proxy error: ' + (err && err.message));
  }
});

app.get('/', (req, res) => {
  res.send('BlumbOS proxy running. Use /proxy?url={url}');
});

app.listen(PORT, () => {
  console.log(`BlumbOS proxy listening on http://localhost:${PORT}`);
});
