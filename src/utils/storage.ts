const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api/records';
const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN as string | undefined;
import { validateRecord } from '../../shared/record-schema.mjs'

function authHeaders(): Record<string, string> {
  return AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {};
}

// SecurityRecord 接口与 shared/record-schema.mjs 保持一致，那边是唯一事实来源
export interface SecurityRecord {
  id: string;
  type: 'false_positive' | 'threat';
  title: string;
  description: string;
  timestamp: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayString(): string {
  return toLocalDateString(new Date());
}

/** 校验导入的整包数据（复用后端同一套字段规则），非法返回 null */
export function sanitizeImported(input: unknown): SecurityRecord[] | null {
  if (!Array.isArray(input) || !input.every((r) => validateRecord(r) === null)) return null;
  return input as SecurityRecord[];
}

export async function loadRecords(date: string = getTodayString()): Promise<SecurityRecord[]> {
  try {
    const response = await fetch(`${API_BASE}?date=${date}`, { headers: authHeaders() });
    if (!response.ok) {
      console.error('加载记录失败: HTTP', response.status);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('加载记录失败:', error);
    return [];
  }
}

// 获取全月汇总统计
export async function loadMonthSummary(year: number, month: number): Promise<Record<string, number>> {
  try {
    const response = await fetch(`${API_BASE}/summary?year=${year}&month=${month}`, { headers: authHeaders() });
    if (!response.ok) return {};
    return await response.json();
  } catch (error) {
    console.error('加载汇总失败:', error);
    return {};
  }
}

/** 保存记录，返回是否成功，调用方必须根据结果提示用户 */
export async function saveRecords(records: SecurityRecord[], date: string = getTodayString()): Promise<boolean> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ date, records })
    });
    if (!response.ok) {
      console.error('保存记录失败: HTTP', response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error('保存记录失败:', error);
    return false;
  }
}

export function exportToJSON(records: SecurityRecord[], date: string = getTodayString()): void {
  const dataStr = JSON.stringify(records, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `security_records_${date}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

