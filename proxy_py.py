from flask import Flask, request, Response, redirect
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

@app.route('/')
def index():
    return 'BlumbOS Python proxy. Use /proxy?url=...'

@app.route('/proxy')
def proxy():
    target = request.args.get('url')
    if not target:
        return Response('Missing url parameter', status=400)
    try:
        resp = requests.get(target, headers={'User-Agent': 'BlumbOS Proxy'}, stream=True, timeout=15)
    except Exception as e:
        return Response('Error fetching target: %s' % str(e), status=500)

    content_type = resp.headers.get('Content-Type', '')
    # Remove security and hop-by-hop/streaming headers that can break proxying
    headers = {}
    skip_headers = {
        'x-frame-options', 'content-security-policy', 'content-security-policy-report-only',
        'set-cookie', 'transfer-encoding', 'content-encoding', 'connection', 'keep-alive',
        'proxy-connection', 'upgrade'
    }
    for k, v in resp.headers.items():
        lk = k.lower()
        if lk in skip_headers:
            continue
        headers[k] = v

    if 'text/html' in content_type:
        try:
            text = resp.text
            soup = BeautifulSoup(text, 'html.parser')
            origin = requests.utils.urlparse(target).scheme + '://' + requests.utils.urlparse(target).hostname # type: ignore
            # ensure base
            if not soup.find('base'):
                base_tag = soup.new_tag('base', href=origin)
                if soup.head:
                    soup.head.insert(0, base_tag)
            else:
                soup.head.base['href'] = origin # type: ignore
            # remove CSP meta
            for meta in soup.find_all('meta'):
                if meta.get('http-equiv') and 'content-security-policy' in meta.get('http-equiv').lower(): # type: ignore
                    meta.decompose()
            out = str(soup)
            headers['Content-Type'] = 'text/html; charset=utf-8'
            return Response(out, headers=headers)
        except Exception as e:
            return Response('Error processing HTML: %s' % str(e), status=500)
    else:
        # binary
        data = resp.content
        if 'Content-Type' in resp.headers:
            headers['Content-Type'] = resp.headers['Content-Type']
        return Response(data, headers=headers)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)

@app.after_request
def add_cors_headers(response):
    # Добавляем заголовки CORS, чтобы клиент мог получать HTML через fetch
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    return response
