# VigilAnalyse 安全事件分析研判记录平台

一个基于Vue 3和Express的数据分析系统，用于记录和误报事件和威胁事件。

## 项目结构

```
VigilAnalyse/
├── src/                    # 前端源代码
├── server.js              # Express后端服务器
├── package.json           # 项目依赖和脚本
├── Dockerfile             # Docker构建配置
├── docker-compose.yml     # Docker Compose配置
├── vite.config.ts         # Vite构建配置
├── tailwind.config.ts     # Tailwind CSS配置
└── .env                   # 环境变量配置
```

## 技术栈

- 前端: Vue 3, TypeScript, Tailwind CSS, Vite
- 后端: Node.js, Express
- 构建工具: Vite
- 样式: Tailwind CSS
- 容器化: Docker, Docker Compose

## 开发环境搭建

### 系统要求

- Node.js v18+
- npm 或 yarn
- Docker (如果使用容器化部署)

### 安装依赖

```bash
# 克隆项目后进入项目目录
npm install
```

### 开发模式运行

项目支持前后端同时开发模式：

```bash
# 同时启动前端(vite)和后端(express)开发服务器
npm run dev

# 或者分别启动
npm run dev:fe  # 启动前端开发服务器 (默认端口: 5173)
npm run dev:be  # 启动后端开发服务器 (默认端口: 3001)
```

开发服务器启动后：
- 前端界面将在 `http://localhost:5173`
- 后端API服务将在 `http://localhost:3001`

### 构建生产版本

```bash
# 构建前端应用到 dist 目录
npm run build
```

构建完成后，会在 `dist` 目录生成静态文件，可以通过后端服务器提供服务。

## 部署方式

### 方式一：Docker部署（推荐）

1. 确保已安装 Docker 和 Docker Compose

2. 构建并启动容器：
```bash
docker-compose up -d
```

3. 应用将在 `http://localhost:3001` 可访问

4. 查看容器日志：
```bash
docker logs vigil-analyse
```

### 方式二：传统部署

1. 构建前端应用：
```bash
npm run build
```

2. 启动后端服务：
```bash
npm run dev:be
```

或者使用 PM2 进行进程管理：
```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server.js --name "vigil-analyse"
```

### 方式三：Nginx反向代理部署

1. 构建前端应用：
```bash
npm run build
```

2. 配置 Nginx（参考项目中的 `nginx.conf`）：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 环境变量配置

项目使用以下环境变量：

- `VITE_API_BASE`: API基础路径
  - 开发环境: `http://localhost:3001/api/records`
  - 生产环境: `/api/records`

根据部署环境修改 `.env` 或 `.env.production` 文件。

## API接口说明

- `GET /api/records/summary`: 获取月度汇总数据
- `GET /api/records`: 获取指定日期的记录
- `POST /api/records`: 保存指定日期的记录
- `*`: 前端路由处理

## 数据存储

- 数据文件存储在 `data/` 目录
- 按日期格式命名: `records_YYYY-MM-DD.json`
- Docker部署时会挂载宿主机目录到容器 `/app/data`

## 项目特性

- 前后端分离架构
- 支持Docker容器化部署
- 自动化构建流程
- 生产环境优化
- 跨域资源共享(CORS)支持
- 原子文件写入确保数据完整性
- 单页应用路由支持

## 故障排除

### 开发环境常见问题

1. **端口被占用**
   - 修改 `vite.config.ts` 中的端口设置
   - 修改 `server.js` 中的端口设置

2. **依赖安装失败**
   - 清除缓存: `npm cache clean --force`
   - 删除 node_modules 并重新安装

### 生产环境常见问题

1. **权限问题**
   - 确保 `data/` 目录有适当的读写权限
   - Docker部署时注意卷挂载路径权限

2. **内存不足**
   - 增加Node.js堆内存限制
   - 优化大量数据的处理方式

## 维护命令

```bash
# 预览构建结果
npm run preview

# 重启Docker服务
docker-compose restart

# 查看Docker日志
docker-compose logs -f
```