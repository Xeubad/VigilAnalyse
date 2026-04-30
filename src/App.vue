<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  SecurityRecord,
  loadRecords,
  loadMonthSummary,
  saveRecords,
  exportToJSON,
  generateId,
  getTodayString,
  toLocalDateString
} from './utils/storage'
import Toast from './components/Toast.vue'
import StatsCards from './components/StatsCards.vue'
import CalendarModal from './components/CalendarModal.vue'
import RecordSidebar from './components/RecordSidebar.vue'
import ConfirmModal from './components/ConfirmModal.vue'

// 状态管理
const selectedDate = ref(getTodayString())
const viewDate = ref(getTodayString())
const records = ref<SecurityRecord[]>([])
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const showCalendar = ref(false)
const currentMonth = ref(new Date())
const showRecords = ref(false)
const showClearConfirm = ref(false)

// 计算属性
const threatCount = computed(() => records.value.filter((r: SecurityRecord) => r.type === 'threat').length)
const falsePositiveCount = computed(() => records.value.filter((r: SecurityRecord) => r.type === 'false_positive').length)

// 日历数据
const calendarDays = ref<Array<{ date: string; day: number; isCurrentMonth: boolean; recordCount: number }>>([])

// 更新日历数据
const updateCalendar = async () => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()

  const summary = await loadMonthSummary(year, month + 1)

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = firstDay.getDay()

  const days: Array<{ date: string; day: number; isCurrentMonth: boolean; recordCount: number }> = []

  for (let i = 0; i < startWeekday; i++) {
    const prevMonthDay = new Date(year, month, -startWeekday + i + 1)
    const dateStr = toLocalDateString(prevMonthDay)
    days.push({ date: dateStr, day: prevMonthDay.getDate(), isCurrentMonth: false, recordCount: summary[dateStr] || 0 })
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const currDay = new Date(year, month, i)
    const dateStr = toLocalDateString(currDay)
    days.push({ date: dateStr, day: i, isCurrentMonth: true, recordCount: summary[dateStr] || 0 })
  }

  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    const nextMonthDay = new Date(year, month + 1, i)
    const dateStr = toLocalDateString(nextMonthDay)
    days.push({ date: dateStr, day: i, isCurrentMonth: false, recordCount: summary[dateStr] || 0 })
  }

  calendarDays.value = days
}

watch(currentMonth, updateCalendar, { immediate: true })

const monthTitle = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth() + 1
  return `${year}年${month}月`
})

const prevMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1)
}

const nextMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1)
}

const selectDate = (date: string) => {
  viewDate.value = date
  showCalendar.value = false
}

onMounted(async () => {
  records.value = await loadRecords(selectedDate.value)
})

watch(viewDate, async (newDate) => {
  records.value = await loadRecords(newDate)
})

// Toast 提示
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

// 快速添加记录
const quickAddRecord = async (type: 'false_positive' | 'threat') => {
  const targetDate = viewDate.value

  const newRecord: SecurityRecord = {
    id: generateId(),
    type,
    title: type === 'threat' ? '威胁事件' : '误报',
    description: '',
    timestamp: targetDate === getTodayString()
      ? new Date().toISOString()
      : `${targetDate}T12:00:00.000Z`,
    severity: type === 'threat' ? 'medium' : undefined,
  }

  const currentRecords = await loadRecords(targetDate)
  const updatedRecords = [newRecord, ...currentRecords]
  await saveRecords(updatedRecords, targetDate)
  records.value = updatedRecords
  updateCalendar()
  showToast(type === 'threat' ? `${targetDate} 威胁事件已补录` : `${targetDate} 误报已补录`)
}

// 删除记录
const handleDelete = async (id: string) => {
  records.value = records.value.filter((r: SecurityRecord) => r.id !== id)
  await saveRecords(records.value, viewDate.value)
  updateCalendar()
  showToast('记录已删除')
}

// 转换记录类型
const handleToggleType = async (id: string) => {
  records.value = records.value.map((r: SecurityRecord) => {
    if (r.id === id) {
      const newType = r.type === 'threat' ? 'false_positive' : 'threat'
      return {
        ...r,
        type: newType,
        title: newType === 'threat' ? '威胁事件' : '误报',
        severity: newType === 'threat' ? (r.severity || 'medium') : undefined,
      }
    }
    return r
  })
  await saveRecords(records.value, viewDate.value)
  updateCalendar()
  showToast('类型转换成功')
}

// 一键对调全天记录类型
const handleBulkSwap = async () => {
  if (records.value.length === 0) return
  records.value = records.value.map((r: SecurityRecord) => {
    const newType = r.type === 'threat' ? 'false_positive' : 'threat'
    return {
      ...r,
      type: newType,
      title: newType === 'threat' ? '威胁事件' : '误报',
      severity: newType === 'threat' ? (r.severity || 'medium') : undefined,
    }
  })
  await saveRecords(records.value, viewDate.value)
  updateCalendar()
  showToast('当日所有类型已对调')
}

// 导出数据
const handleExport = () => {
  if (records.value.length === 0) {
    showToast('没有可导出的记录', 'error')
    return
  }
  exportToJSON(records.value, viewDate.value)
  showToast('导出成功')
}

// 导入数据
const handleImport = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (event) => {
    try {
      const imported = JSON.parse(event.target?.result as string)
      if (Array.isArray(imported)) {
        records.value = imported
        await saveRecords(imported, viewDate.value)
        updateCalendar()
        showToast(`成功导入 ${imported.length} 条记录`)
      } else {
        showToast('文件格式错误', 'error')
      }
    } catch {
      showToast('导入失败,请检查文件格式', 'error')
    }
  }
  reader.readAsText(file)
  target.value = ''
}

const toggleCalendar = () => { showCalendar.value = !showCalendar.value }
const toggleRecords = () => { showRecords.value = !showRecords.value }

const goToToday = () => {
  viewDate.value = getTodayString()
  currentMonth.value = new Date()
  showCalendar.value = false
}

const clearDayRecords = async () => {
  const currentRecords = await loadRecords(viewDate.value)
  if (currentRecords.length === 0) {
    showToast('该日期暂无记录', 'error')
    return
  }
  showClearConfirm.value = true
}

const confirmClear = async () => {
  await saveRecords([], viewDate.value)
  records.value = []
  updateCalendar()
  showClearConfirm.value = false
  showToast(`${viewDate.value} 的记录已全部清除`)
}
</script>

<template>
  <div class="min-h-screen p-4 md:p-8 relative flex items-center">
    <!-- 右上角工具栏 -->
    <transition name="fade">
      <div v-if="!showRecords" class="fixed top-4 right-4 z-50 flex items-center gap-2">
        <input ref="fileInputRef" type="file" accept=".json" @change="handleImport" class="hidden" />
        <button class="btn btn-ghost text-[10px] py-1.5 px-3 border-border/50" @click="fileInputRef?.click()" title="导入记录">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17,8 12,3 7,8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          导入
        </button>
        <button class="btn btn-ghost text-[10px] py-1.5 px-3 border-border/50" @click="handleExport" title="导出记录">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          导出
        </button>
        <button class="btn btn-ghost text-[10px] py-1.5 px-3 border-danger/30 hover:border-danger/60 text-danger/70 hover:text-danger transition-all" @click="clearDayRecords" title="清除当日记录">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          清除
        </button>
        <button class="btn btn-ghost text-[10px] py-1.5 px-3 border-border/50 hover:border-primary/50" @click="toggleRecords" title="查看历史记录">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          记录
          <span class="ml-1.5 bg-primary/20 text-primary text-[9px] px-1.5 rounded-sm border border-primary/30">{{ records.length }}</span>
        </button>
      </div>
    </transition>

    <!-- Toast -->
    <transition name="slide-down">
      <Toast v-if="toast" :message="toast.message" :type="toast.type" />
    </transition>

    <div class="max-w-6xl mx-auto w-full">
      <!-- Header -->
      <header class="text-center mb-12">
        <div class="inline-flex items-center gap-4 text-primary mb-6">
          <svg class="w-12 h-12 glow-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <h1 class="text-5xl font-black tracking-tighter glow-green">
            VIGIL<span class="text-accent">ANALYSE</span>
          </h1>
        </div>
        <p class="text-muted-foreground text-sm uppercase tracking-[0.3em] font-medium">
          <span class="text-primary">//</span> 安全事件分析研判记录平台 <span class="text-primary">//</span>
        </p>
      </header>

      <!-- Stats Cards -->
      <StatsCards :false-positive-count="falsePositiveCount" :threat-count="threatCount" />

      <!-- Date Picker -->
      <div class="flex justify-center mb-12 w-full">
        <div class="card flex items-center justify-between gap-6 w-full max-w-2xl px-10 py-6">
          <div class="flex items-center gap-3 text-primary">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span class="font-black uppercase tracking-[0.2em] text-sm">选择日期</span>
          </div>
          <div class="flex items-center gap-4">
            <button @click="toggleCalendar" class="text-lg font-mono font-black text-foreground hover:text-primary transition-all px-6 py-2 border-2 border-border rounded-lg hover:border-primary bg-background/50">
              {{ viewDate }}
            </button>
            <button v-if="viewDate !== getTodayString()" @click="goToToday" class="text-xs text-primary hover:underline font-black uppercase tracking-widest px-4 py-2 bg-primary/10 rounded-md border border-primary/30">
              返回今日
            </button>
          </div>
        </div>
      </div>

      <!-- 日历选择器 -->
      <transition name="fade">
        <CalendarModal
          v-if="showCalendar"
          :view-date="viewDate"
          :calendar-days="calendarDays"
          :month-title="monthTitle"
          :get-today-string="getTodayString"
          @close="showCalendar = false"
          @select-date="selectDate"
          @prev-month="prevMonth"
          @next-month="nextMonth"
        />
      </transition>

      <!-- Action Buttons -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 w-full">
        <button class="btn btn-success justify-center text-2xl py-10" @click="quickAddRecord('false_positive')">
          <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <span class="font-black">记录误报</span>
        </button>
        <button class="btn btn-danger justify-center text-2xl py-10" @click="quickAddRecord('threat')">
          <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span class="font-black">上报威胁</span>
        </button>
      </div>

      <!-- Footer -->
      <footer class="text-center mt-4 text-xs text-muted-foreground uppercase tracking-wider">
        <span class="text-primary">//</span> 数据按日期存储在本地 <span class="text-primary">//</span>
      </footer>
    </div>

    <!-- 历史记录侧边栏 -->
    <RecordSidebar
      :show="showRecords"
      :records="records"
      :view-date="viewDate"
      :get-today-string="getTodayString"
      @close="showRecords = false"
      @delete="handleDelete"
      @toggle-type="handleToggleType"
      @bulk-swap="handleBulkSwap"
    />

    <!-- 清除确认模态框 -->
    <transition name="fade">
      <ConfirmModal
        v-if="showClearConfirm"
        :view-date="viewDate"
        @confirm="confirmClear"
        @cancel="showClearConfirm = false"
      />
    </transition>
  </div>
</template>
