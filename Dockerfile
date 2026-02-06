# 第一阶段：构建前端
FROM registry.cn-wulanchabu.aliyuncs.com/xpled/node:18-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 第二阶段：运行 Node 后端服务
FROM registry.cn-wulanchabu.aliyuncs.com/xpled/node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
# 从构建阶段复制编译好的前端文件
COPY --from=build-stage /app/dist ./dist
# 复制后端源码
COPY server.js ./

# 创建并导出数据目录
RUN mkdir -p data
VOLUME /app/data

EXPOSE 3001
CMD ["node", "server.js"]
