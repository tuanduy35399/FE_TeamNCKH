import { readFile } from 'node:fs/promises';
import path from 'node:path';

const base = (process.env.MAICARE_DEPLOY_API_URL || '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(base)) throw new Error('Set MAICARE_DEPLOY_API_URL to the Django base URL.');
const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const username = `release_${suffix}`;
const password = `MaiCare!${suffix}z`;
const evidence = { base, auth: false, history: false, freshClient: false, text: null, image: null, followUp: null };
let access = '';
let refresh = '';
let accountCreated = false;
const started = Date.now();

async function request(route, options = {}, timeoutMs = 180_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(options.headers);
    if (access) headers.set('Authorization', `Bearer ${access}`);
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData) && !(options.body instanceof Blob)) {
      headers.set('Content-Type', 'application/json');
      options = { ...options, body: JSON.stringify(options.body) };
    }
    const response = await fetch(`${base}${route}`, { ...options, headers, signal: controller.signal });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    if (!response.ok) {
      const error = new Error(`${options.method || 'GET'} ${route} -> HTTP ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  } finally { clearTimeout(timer); }
}

function failure(error) { return { status: 'FAIL', httpStatus: error.status, message: error.message }; }

async function runImage(historyId) {
  const imagePath = path.resolve(process.cwd(), '..', '..', 'reference', 'django-backend', 'diseases', '20260124_151321.jpg');
  const bytes = await readFile(imagePath);
  const send = async () => {
    const form = new FormData();
    form.append('image', new Blob([bytes], { type: 'image/jpeg' }), 'leaf.jpg');
    form.append('question', 'Hãy phân tích ảnh lá mai này.');
    return request(`/api/v1/history/${historyId}/chat/image/`, { method: 'POST', body: form });
  };
  try { return await send(); }
  catch (error) {
    if (error.status >= 500 && error.status <= 599) { await new Promise(resolve => setTimeout(resolve, 15_000)); return send(); }
    throw error;
  }
}

try {
  await request('/api/v1/schema/');
  await request('/api/v1/user/register/', { method: 'POST', body: { username, name: 'Release acceptance', email: `${username}@local.test`, password } });
  accountCreated = true;
  const tokens = await request('/api/v1/user/login/', { method: 'POST', body: { username, password } });
  if (!tokens?.access || !tokens?.refresh) throw new Error('Login did not return both tokens.');
  access = tokens.access; refresh = tokens.refresh;
  const me = await request('/api/v1/user/me/');
  if (!me?.id) throw new Error('Account endpoint did not return an id.');
  const refreshed = await request('/api/v1/user/login/refresh/', { method: 'POST', body: { refresh } });
  if (!refreshed?.access) throw new Error('Refresh did not return an access token.');
  access = refreshed.access; evidence.auth = true;

  const historyA = await request('/api/v1/history/', { method: 'POST', body: { title: 'Release A' } });
  const historyB = await request('/api/v1/history/', { method: 'POST', body: { title: 'Release B' } });
  const list = await request('/api/v1/history/');
  if (!Array.isArray(list) || !list.some(item => item.id === historyA.id) || !list.some(item => item.id === historyB.id)) throw new Error('A/B histories are not present in the list.');
  evidence.history = true;

  try {
    const result = await request(`/api/v1/history/${historyA.id}/chat/`, { method: 'POST', body: { question: 'Cách chăm sóc mai vàng sau khi ra hoa?' } });
    evidence.text = { status: 'PASS', answerLength: result?.answer?.length || 0 };
  } catch (error) { evidence.text = failure(error); }
  const detailA = await request(`/api/v1/history/${historyA.id}/`);
  if (!Array.isArray(detailA.messages)) throw new Error('History detail has no messages.');

  try {
    const result = await runImage(historyB.id);
    if (typeof result?.answer !== 'string' || !Array.isArray(result?.detections)) throw new Error('Image response lacks answer or detections.');
    evidence.image = { status: 'PASS', detectionCount: result.detections.length, answerLength: result.answer.length };
    try {
      const followUp = await request(`/api/v1/history/${historyB.id}/chat/`, { method: 'POST', body: { question: 'Tôi nên theo dõi cây trong bao lâu?' } });
      evidence.followUp = { status: 'PASS', answerLength: followUp?.answer?.length || 0 };
    } catch (error) { evidence.followUp = failure(error); }
  } catch (error) { evidence.image = failure(error); }

  access = '';
  const fresh = await request('/api/v1/user/login/', { method: 'POST', body: { username, password } });
  access = fresh.access;
  await request(`/api/v1/history/${historyA.id}/`);
  await request(`/api/v1/history/${historyB.id}/`);
  evidence.freshClient = true;

  const passed = evidence.auth && evidence.history && evidence.freshClient && evidence.text?.status === 'PASS' && evidence.image?.status === 'PASS' && evidence.followUp?.status === 'PASS';
  console.log(JSON.stringify({ status: passed ? 'PASS' : 'PARTIAL', ...evidence, durationMs: Date.now() - started }));
  if (!passed) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ status: 'FAIL', ...evidence, fatal: failure(error), durationMs: Date.now() - started }));
  process.exitCode = 1;
} finally {
  if (accountCreated && access) await request('/api/v1/user/me/', { method: 'DELETE' }, 60_000).catch(() => undefined);
}
