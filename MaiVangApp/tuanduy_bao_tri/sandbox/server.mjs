import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fonts = {
  '/regular.ttf': 'Roboto_400Regular.ttf',
  '/medium.ttf': 'Roboto_500Medium.ttf',
  '/bold.ttf': 'Roboto_700Bold.ttf',
};
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,">
<title>Sandbox Markdown MaiCare</title><style>
@font-face{font-family:Roboto_400Regular;src:url('/regular.ttf')}
@font-face{font-family:Roboto_500Medium;src:url('/medium.ttf')}
@font-face{font-family:Roboto_700Bold;src:url('/bold.ttf')}
*{box-sizing:border-box}body{margin:0;background:#F8F5EC;color:#18221C;font-family:Roboto_400Regular,sans-serif}
main{max-width:960px;margin:auto;padding:16px}h1{font-size:22px}p{font-size:14px;line-height:1.5}
label{display:block;margin:8px 0}select,textarea{font:inherit;width:100%;padding:8px}
textarea{height:140px}select{max-width:300px}.fixture-note{font-size:12px;color:#667269}
.message-row{display:flex}.bubble{max-width:90%;min-width:44px;padding:12px;border:1px solid #DDE4DD;border-radius:18px 18px 18px 5px;background:white;flex-shrink:1}
</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`;

export async function startSandbox(port = 0) {
  const result = await build({
    absWorkingDir: root,
    entryPoints: ['tuanduy_bao_tri/sandbox/entry.jsx'],
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    jsx: 'automatic',
    alias: { 'react-native': 'react-native-web' },
    define: { 'process.env.NODE_ENV': '"development"', __DEV__: 'true', global: 'globalThis' },
    logLevel: 'silent',
  });
  const server = createServer(async (request, response) => {
    if (request.url === '/bundle.js') {
      response.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      response.end(result.outputFiles[0].contents);
    } else if (fonts[request.url]) {
      try {
        const data = await readFile(path.join(root, 'node_modules/@expo-google-fonts/roboto', fonts[request.url]));
        response.writeHead(200, { 'Content-Type': 'font/ttf' });
        response.end(data);
      } catch (error) {
        response.writeHead(500);
        response.end(String(error));
      }
    } else if (request.url === '/' || request.url === '/progress') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(html);
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { url } = await startSandbox(Number(process.env.MARKDOWN_SANDBOX_PORT || 5188));
  console.log(`Markdown sandbox: ${url}`);
}
