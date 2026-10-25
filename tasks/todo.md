# 任务待办

## 完整性补齐（不含 CI/CD）— 2026-10-25

目标：补齐接口测试、保存前备份、前后端共享类型契约。不做：CI/CD、数据库迁移、用户系统。

- [x] 共享类型契约：`shared/record-schema.mjs` 作为唯一事实来源，后端逐字段校验，前端复用
- [x] 保存前备份：POST 覆盖前将旧文件轮转为 `.bak`
- [x] 接口测试：node:test + supertest，12 个用例覆盖 3 个 API 的正常流和 400/401 分支
- [x] 验证：`npm test` 12/12 通过 + `npm run build` 通过
- [x] README 补充测试命令、备份机制和契约说明

### 验证记录（2026-10-25）

- `npm test`：12 个用例全部通过（含子进程启动真实服务的鉴权测试）
- `npm run build`：vue-tsc 类型检查 + vite 构建通过
- 已知环境问题：本机 node_modules 缺 `@rollup/rollup-darwin-arm64`（npm bug），已 `--no-save` 补装；重装依赖后如复现需删 lock 重装

### 遗留（后续可选）

- CI/CD（用户明确本轮不做）
- 并发写竞态：整文件覆盖模型下的 read-modify-write 仍无版本控制，单用户场景可接受
- 备份只保留一代（.bak），更早版本需靠外部备份
