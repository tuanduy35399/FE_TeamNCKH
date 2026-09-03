const http = require('node:http');
const { URL } = require('node:url');

const listenHost = '127.0.0.1';
const listenPort = 8010;
const target = new URL(process.env.MAIVANG_BACKEND_ORIGIN || 'http://127.0.0.1:8000');
const allowedOrigins = new Set(['http://localhost:5175', 'http://127.0.0.1:5175']);
const allowedPrefixes = ['/api/v1/user/', '/api/v1/schema/'];
const hopByHop = new Set(['connection', 'content-length', 'host', 'transfer-encoding']);

const maxRequestBytes = 1024 * 1024;

const server = http.createServer((request, response) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    response.writeHead(403, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ detail: 'Origin is not allowed by the development bridge.' }));
    return;
  }
  if (!request.url || !allowedPrefixes.some(prefix => request.url.startsWith(prefix))) {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ detail: 'Path is not available through the development bridge.' }));
    return;
  }
  const corsHeaders = origin ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Vary': 'Origin',
  } : {};
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }
  const headers = {};
  for (const [name, value] of Object.entries(request.headers)) {
    if (!hopByHop.has(name) && name !== 'origin' && value !== undefined) headers[name] = value;
  }
  const chunks = [];
  let receivedBytes = 0;
  request.on('data', chunk => {
    receivedBytes += chunk.length;
    if (receivedBytes > maxRequestBytes) {
      response.writeHead(413, { ...corsHeaders, 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ detail: 'Request is too large for the authentication bridge.' }));
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });
  request.on('end', () => {
    if (response.writableEnded) return;
    const body = Buffer.concat(chunks);
    if (body.length) headers['content-length'] = String(body.length);
    const upstream = http.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      method: request.method,
      path: request.url,
      headers,
    }, upstreamResponse => {
      const responseHeaders = { ...corsHeaders };
      for (const [name, value] of Object.entries(upstreamResponse.headers)) {
        if (!hopByHop.has(name) && name.toLowerCase() !== 'access-control-allow-origin' && value !== undefined) responseHeaders[name] = value;
      }
      response.writeHead(upstreamResponse.statusCode || 502, responseHeaders);
      upstreamResponse.pipe(response);
    });
    upstream.on('error', () => {
      if (!response.headersSent) response.writeHead(502, { ...corsHeaders, 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ detail: 'The development bridge cannot reach Django.' }));
    });
    upstream.end(body);
  });
});

server.listen(listenPort, listenHost, () => {
  process.stdout.write(`Mai Vang API bridge: http://${listenHost}:${listenPort} -> ${target.origin}\n`);
});

function shutdown() { server.close(() => process.exit(0)); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
