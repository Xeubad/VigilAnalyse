import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import cors from 'cors';
import { validateRecord } from './shared/record-schema.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

// 开发环境前后端不同源需要 CORS；生产环境前后端同域，不再放开跨域
if (process.env.NODE_ENV !== 'production') {
  app.use(cors());
}
app.use(express.json());

// 最小鉴权：设置 AUTH_TOKEN 后，所有 /api 请求需携带 Authorization: Bearer <token>
// 注意：SPA 场景下前端 token 会打包进静态资源，只能拦截扫描器和跨域写屟，
// 面向公网的强保护请用 Nginx Basic Auth 或 VPN/内网限制
if (AUTH_TOKEN) {
  app.use('/api', (req, res, next) => {
    if (req.get('Authorization') === `Bearer ${AUTH_TOKEN}`) return next();
    res.status(401).json({ error: '未授权' });
  });
} else if (process.env.NODE_ENV === 'production') {
  console.warn('[安全警告] 生产环境未设置 AUTH_TOKEN，API 处于无鉴权状态');
}

// 静态资源托管：将前端编译后的 dist 目录公开
app.use(express.static(path.join(__dirname, 'dist')));

// 确保数据目录存在
fs.ensureDirSync(DATA_DIR);

// 校验日期格式（YYYY-MM-DD）
function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

// 安全解析文件路径，防止路径穿越
function safeFilePath(date) {
  const filePath = path.resolve(DATA_DIR, `records_${date}.json`);
  if (!filePath.startsWith(DATA_DIR + path.sep)) return null;
  return filePath;
}


// 获取月度汇总数据（优化性能）
app.get('/api/records/summary', async (req, res) => {
  const { year, month } = req.query;

  // 校验 year 和 month
  if (!/^\d{4}$/.test(year) || !/^(1[0-2]|[1-9])$/.test(month)) {
    return res.status(400).json({ error: '参数格式错误' });
  }

  const summary = {};
  
  try {
    const files = await fs.readdir(DATA_DIR);
    // 匹配格式如 records_2024-03-*.json 的文件
    const prefix = `records_${year}-${String(month).padStart(2, '0')}`;
    
    for (const file of files) {
      if (file.startsWith(prefix) && file.endsWith('.json')) {
        const dateStr = file.replace('records_', '').replace('.json', '');
        const data = await fs.readJson(path.join(DATA_DIR, file));
        summary[dateStr] = data.length;
      }
    }
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: '获取汇总失败' });
  }
});

// 获取指定日期的记录
app.get('/api/records', async (req, res) => {
  const { date } = req.query;

  if (!date || !isValidDate(date)) {
    return res.status(400).json({ error: '日期格式错误，需为 YYYY-MM-DD' });
  }

  const filePath = safeFilePath(date);
  if (!filePath) {
    return res.status(400).json({ error: '非法路径' });
  }
  
  try {
    if (await fs.pathExists(filePath)) {
      const data = await fs.readJson(filePath);
      res.json(data);
    } else {
      res.json([]);
    }
  } catch (err) {
    res.status(500).json({ error: '读取文件失败' });
  }
});

// 保存指定日期的记录
app.post('/api/records', async (req, res) => {
  const { date, records } = req.body;

  if (!date || !isValidDate(date)) {
    return res.status(400).json({ error: '日期格式错误，需为 YYYY-MM-DD' });
  }
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'records 必须是数组' });
  }
  const firstInvalid = records.find((r) => validateRecord(r) !== null);
  if (firstInvalid !== undefined) {
    return res.status(400).json({ error: `记录校验失败：${validateRecord(firstInvalid)}` });
  }

  const filePath = safeFilePath(date);
  if (!filePath) {
    return res.status(400).json({ error: '非法路径' });
  }
  const tempPath = `${filePath}.tmp`;
  const backupPath = `${filePath}.bak`;

  try {
    // 使用原子写入：先写临时文件，覆盖前把旧文件轮转为 .bak，再重命名
    await fs.writeJson(tempPath, records, { spaces: 2 });
    if (await fs.pathExists(filePath)) {
      await fs.copy(filePath, backupPath, { overwrite: true });
    }
    await fs.move(tempPath, filePath, { overwrite: true });
    res.json({ success: true });
  } catch (err) {
    if (await fs.pathExists(tempPath)) await fs.remove(tempPath);
    res.status(500).json({ error: '写入文件失败' });
  }
});

// 处理前端单页路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 统一错误处理：JSON 解析失败返回 400，其余返回 500
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: '请求体 JSON 格式错误' });
  }
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 作为主模块运行时才监听端口，被测试导入时只导出 app
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`数据存储服务运行在: http://localhost:${PORT}`);
  });
}

export { app };
