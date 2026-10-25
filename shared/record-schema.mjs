// 前后端共享的记录结构契约：修改字段时本文件是唯一事实来源。
// server.js（后端校验）和 src/utils/storage.ts（前端导入校验）都从这里取规则。

export const RECORD_TYPES = ['false_positive', 'threat'];
export const SEVERITIES = ['low', 'medium', 'high', 'critical'];

/**
 * 校验单条记录，合法返回 null，非法返回首个错误信息。
 * @param {unknown} r
 * @returns {string | null}
 */
export function validateRecord(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return '记录必须是对象';
  if (typeof r.id !== 'string' || r.id === '') return 'id 必须是非空字符串';
  if (!RECORD_TYPES.includes(r.type)) return `type 必须是 ${RECORD_TYPES.join(' 或 ')}`;
  if (typeof r.title !== 'string') return 'title 必须是字符串';
  if (typeof r.description !== 'string') return 'description 必须是字符串';
  if (typeof r.timestamp !== 'string' || Number.isNaN(Date.parse(r.timestamp))) {
    return 'timestamp 必须是合法的时间字符串';
  }
  if (r.severity !== undefined && !SEVERITIES.includes(r.severity)) {
    return `severity 必须是 ${SEVERITIES.join('/')}`;
  }
  return null;
}
