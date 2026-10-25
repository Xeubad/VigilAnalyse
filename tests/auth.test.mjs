// 鉴权中间件的集成测试：以子进程启动真实服务（带 AUTH_TOKEN），用 fetch 验证 401/放行
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3997;
const BASE = `http://localhost:${PORT}`;
const TOKEN = 'test-token-123';

function startServer() {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(PORT), AUTH_TOKEN: TOKEN, DATA_DIR: path.join(__dirname, 'tmp-auth-data') },
    stdio: 'ignore',
  });
  return child;
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${BASE}/api/records?date=2026-05-01`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('测试服务未能启动');
}

test('设置 AUTH_TOKEN 后：无 token 返回 401，带 token 正常', async () => {
  const child = startServer();
  try {
    await waitForServer();

    const denied = await fetch(`${BASE}/api/records?date=2026-05-01`);
    assert.equal(denied.status, 401);

    const allowed = await fetch(`${BASE}/api/records?date=2026-05-01`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(allowed.status, 200);
    assert.deepEqual(await allowed.json(), []);
  } finally {
    child.kill();
  }
});
