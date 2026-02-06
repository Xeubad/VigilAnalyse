const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api/records';

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

export async function loadRecords(date: string = getTodayString()): Promise<SecurityRecord[]> {
  try {
    const response = await fetch(`${API_BASE}?date=${date}`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('加载记录失败:', error);
    return [];
  }
}

// 获取全月汇总统计
export async function loadMonthSummary(year: number, month: number): Promise<Record<string, number>> {
  try {
    const response = await fetch(`${API_BASE}/summary?year=${year}&month=${month}`);
    if (!response.ok) return {};
    return await response.json();
  } catch (error) {
    console.error('加载汇总失败:', error);
    return {};
  }
}

export async function saveRecords(records: SecurityRecord[], date: string = getTodayString()): Promise<void> {
  try {
    await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, records })
    });
  } catch (error) {
    console.error('保存记录失败:', error);
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
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
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

