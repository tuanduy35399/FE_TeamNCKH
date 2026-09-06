const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

const listenHost = '127.0.0.1';
const listenPort = 8010;
const djangoTarget = new URL(process.env.MAIVANG_DJANGO_ORIGIN || 'https://chat-bot-maivang-backend.onrender.com');
const chatTarget = new URL(process.env.MAIVANG_CHAT_ORIGIN || 'https://chat-service-nckh.onrender.com');
const allowedOrigins = new Set(['http://localhost:5175', 'http://127.0.0.1:5175']);
const djangoPrefixes = ['/api/v1/user/', '/api/v1/history/', '/api/v1/diseases/', '/api/v1/schema/'];
const hopByHop = new Set(['connection', 'host', 'transfer-encoding']);

const server = http.createServer((request, response) => {
  const origin = request.headers.origin;
  const corsHeaders = origin ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Vary': 'Origin',
  } : {};
  if (origin && !allowedOrigins.has(origin)) {
    response.writeHead(403, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ detail: 'Origin is not allowed by the development bridge.' }));
    return;
  }
  if (request.method === 'OPTIONS') { response.writeHead(204, corsHeaders); response.end(); return; }
  const url = request.url || '';
  if (request.method === 'GET' && url === '/__maicare_bridge_health') {
    response.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ service: 'maicare-api-bridge' }));
    return;
  }
  const isChat = url.startsWith('/ai/');
  if (!isChat && !djangoPrefixes.some(prefix => url.startsWith(prefix))) {
    response.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ detail: 'Path is not available through the development bridge.' }));
    return;
  }
  const target = isChat ? chatTarget : djangoTarget;
  const upstreamPath = isChat ? url.slice(3) : url;
  const headers = {};
  for (const [name, value] of Object.entries(request.headers)) {
    if (!hopByHop.has(name) && name !== 'origin' && value !== undefined) headers[name] = value;
  }
  const transport = target.protocol === 'https:' ? https : http;
  const upstream = transport.request({ protocol: target.protocol, hostname: target.hostname, port: target.port, method: request.method, path: upstreamPath, headers }, upstreamResponse => {
    const responseHeaders = { ...corsHeaders };
    for (const [name, value] of Object.entries(upstreamResponse.headers)) {
      if (!hopByHop.has(name) && name.toLowerCase() !== 'access-control-allow-origin' && value !== undefined) responseHeaders[name] = value;
    }
    response.writeHead(upstreamResponse.statusCode || 502, responseHeaders);
    upstreamResponse.pipe(response);
  });
  upstream.setTimeout(180_000, () => upstream.destroy(new Error('upstream timeout')));
  upstream.on('error', () => {
    if (!response.headersSent) response.writeHead(502, { ...corsHeaders, 'Content-Type': 'application/json' });
    if (!response.writableEnded) response.end(JSON.stringify({ detail: 'The requested MaiCare service is unavailable.' }));
  });
  request.on('aborted', () => upstream.destroy());
  request.pipe(upstream);
});

server.listen(listenPort, listenHost, () => process.stdout.write(`MaiCare bridge ready at http://${listenHost}:${listenPort}\n`));
function shutdown() { server.close(() => process.exit(0)); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
