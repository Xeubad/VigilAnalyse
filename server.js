import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json());

// 静态资源托管：将前端编译后的 dist 目录公开
app.use(express.static(path.join(__dirname, 'dist')));

// 确保数据目录存在
fs.ensureDirSync(DATA_DIR);


// 获取月度汇总数据（优化性能）
app.get('/api/records/summary', async (req, res) => {
  const { year, month } = req.query;
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
  const filePath = path.join(DATA_DIR, `records_${date}.json`);
  
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
  const filePath = path.join(DATA_DIR, `records_${date}.json`);
  const tempPath = `${filePath}.tmp`;
  
  try {
    // 使用原子写入：先写临时文件，再重命名
    await fs.writeJson(tempPath, records, { spaces: 2 });
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

app.listen(PORT, () => {
  console.log(`数据存储服务运行在: http://localhost:${PORT}`);
});
