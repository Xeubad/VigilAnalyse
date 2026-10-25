// server.js 三个 API 的集成测试。
// 运行：npm test（DATA_DIR 指向临时目录，不触碰真实 data/）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'vigil-test-'));
process.env.DATA_DIR = DATA_DIR;

const { app } = await import('../server.js');
const request = (await import('supertest')).default;

const VALID_RECORD = {
  id: 'test-1',
  type: 'threat',
  title: '威胁事件',
  description: '',
  timestamp: '2026-05-01T12:00:00.000Z',
  severity: 'medium',
};

after(() => {
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

test('GET 无记录日期返回空数组', async () => {
  const res = await request(app).get('/api/records?date=2026-05-01');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
});

test('POST 合法记录后可读回，文件落在 DATA_DIR', async () => {
  const res = await request(app)
    .post('/api/records')
    .send({ date: '2026-05-01', records: [VALID_RECORD] });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { success: true });

  const readBack = await request(app).get('/api/records?date=2026-05-01');
  assert.equal(readBack.status, 200);
  assert.equal(readBack.body.length, 1);
  assert.equal(readBack.body[0].id, 'test-1');
  assert.ok(fs.existsSync(path.join(DATA_DIR, 'records_2026-05-01.json')));
});

test('POST 再次覆盖后生成 .bak 备份，内容是上一版', async () => {
  const second = { ...VALID_RECORD, id: 'test-2', description: '第二版' };
  const res = await request(app)
    .post('/api/records')
    .send({ date: '2026-05-01', records: [second] });
  assert.equal(res.status, 200);

  const backupPath = path.join(DATA_DIR, 'records_2026-05-01.json.bak');
  assert.ok(fs.existsSync(backupPath), '.bak 应存在');
  const backup = await fs.readJson(backupPath);
  assert.equal(backup.length, 1);
  assert.equal(backup[0].id, 'test-1', '.bak 应保存被覆盖前的版本');
});

test('POST 非数组 records 返回 400', async () => {
  const res = await request(app).post('/api/records').send({ date: '2026-05-01', records: 'x' });
  assert.equal(res.status, 400);
});

test('POST 字段非法的记录返回 400 并给出字段名', async () => {
  const res = await request(app)
    .post('/api/records')
    .send({ date: '2026-05-01', records: [{ ...VALID_RECORD, type: 'oops' }] });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /type/);
});

test('POST 缺 severity 或 severity 非法返回 400', async () => {
  const res = await request(app)
    .post('/api/records')
    .send({ date: '2026-05-01', records: [{ ...VALID_RECORD, severity: 'urgent' }] });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /severity/);
});

test('POST 坏 JSON 返回 400', async () => {
  const res = await request(app)
    .post('/api/records')
    .set('Content-Type', 'application/json')
    .send('{bad');
  assert.equal(res.status, 400);
});

test('GET 非法日期（含路径穿越尝试）返回 400', async () => {
  for (const date of ['../../etc/passwd', '2026-5-1', 'abc']) {
    const res = await request(app).get(`/api/records?date=${encodeURIComponent(date)}`);
    assert.equal(res.status, 400, `date=${date} 应被拒绝`);
  }
});

test('GET summary 返回当月各日记录数', async () => {
  const res = await request(app).get('/api/records/summary?year=2026&month=5');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { '2026-05-01': 1 });
});

test('GET summary 非法参数返回 400', async () => {
  const res = await request(app).get('/api/records/summary?year=abcd&month=13');
  assert.equal(res.status, 400);
});

test('summary 不把 .bak 文件计入统计', async () => {
  const res = await request(app).get('/api/records/summary?year=2026&month=5');
  assert.deepEqual(res.body, { '2026-05-01': 1 });
});
