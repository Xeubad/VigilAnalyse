<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { 
  SecurityRecord, 
  loadRecords, 
  loadMonthSummary,
  saveRecords, 
  exportToJSON, 
  generateId, 
  formatDate,
  getTodayString,
  toLocalDateString 
} from './utils/storage'

// 状态管理
const selectedDate = ref(getTodayString())
const viewDate = ref(getTodayString()) // 用于查看的日期
const records = ref<SecurityRecord[]>([])
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const showCalendar = ref(false) // 控制日历显示
const currentMonth = ref(new Date()) // 当前查看的月份
const showRecords = ref(false) // 控制历史记录面板显示
const showClearConfirm = ref(false) // 控制清除确认模态框

// 计算属性
const threatCount = computed(() => records.value.filter((r: SecurityRecord) => r.type === 'threat').length)
const falsePositiveCount = computed(() => records.value.filter((r: SecurityRecord) => r.type === 'false_positive').length)

// 严重等级标签
const severityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重'
}

// 日历数据
const calendarDays = ref<Array<{ date: string; day: number; isCurrentMonth: boolean; recordCount: number }>>([])

// 更新日历数据
const updateCalendar = async () => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  
  // 1. 发送单次请求获取全月统计
  const summary = await loadMonthSummary(year, month + 1)
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = firstDay.getDay()
  
  const days: any[] = []
  
  // 填充上个月
  for (let i = 0; i < startWeekday; i++) {
    const prevMonthDay = new Date(year, month, -startWeekday + i + 1)
    const dateStr = toLocalDateString(prevMonthDay)
    days.push({
      date: dateStr,
      day: prevMonthDay.getDate(),
      isCurrentMonth: false,
      recordCount: summary[dateStr] || 0
    })
  }
  
  // 填充当月
  for (let i = 1; i <= daysInMonth; i++) {
    const currDay = new Date(year, month, i)
    const dateStr = toLocalDateString(currDay)
    days.push({
      date: dateStr,
      day: i,
      isCurrentMonth: true,
      recordCount: summary[dateStr] || 0
    })
  }
  
  // 填充下个月
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    const nextMonthDay = new Date(year, month + 1, i)
    const dateStr = toLocalDateString(nextMonthDay)
    days.push({
      date: dateStr,
      day: i,
      isCurrentMonth: false,
      recordCount: summary[dateStr] || 0
    })
  }

  calendarDays.value = days
}

// 监听月份变化
watch(currentMonth, updateCalendar, { immediate: true })

// 格式化月份标题
const monthTitle = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth() + 1
  return `${year}年${month}月`
})

// 上一月
const prevMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1)
}

// 下一月
const nextMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1)
}

// 选择日期
const selectDate = (date: string) => {
  viewDate.value = date
  showCalendar.value = false
}

// 生命周期
onMounted(async () => {
  records.value = await loadRecords(selectedDate.value)
})

// 监听查看日期变化
watch(viewDate, async (newDate) => {
  records.value = await loadRecords(newDate)
})

// Toast 提示
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  toast.value = { message, type }
  setTimeout(() => {
    toast.value = null
  }, 3000)
}

// 快速添加记录（无需弹窗）
const quickAddRecord = async (type: 'false_positive' | 'threat') => {
  const targetDate = viewDate.value // 使用当前选中的/查看的日期
  
  const newRecord: SecurityRecord = {
    id: generateId(),
    type,
    title: type === 'threat' ? '威胁事件' : '误报',
    description: '',
    timestamp: targetDate === getTodayString() 
      ? new Date().toISOString() 
      : `${targetDate}T12:00:00.000Z`, // 如果是补录历史数据，默认设为中午
    severity: type === 'threat' ? 'medium' : undefined,
  }
  
  // 加载目标日期的记录
  const currentRecords = await loadRecords(targetDate)
  const updatedRecords = [newRecord, ...currentRecords]
  await saveRecords(updatedRecords, targetDate)
  
  // 立即更新当前列表显示
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

// 转换记录类型 (误报 <-> 威胁)
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

// 切换日历显示
const toggleCalendar = () => {
  showCalendar.value = !showCalendar.value
}

// 切换历史记录面板
const toggleRecords = () => {
  showRecords.value = !showRecords.value
}

// 回到今天
const goToToday = () => {
  viewDate.value = getTodayString()
  currentMonth.value = new Date()
  showCalendar.value = false
}

// 清除当前日期的所有记录
const clearDayRecords = async () => {
  const dateToClear = viewDate.value
  const currentRecords = await loadRecords(dateToClear)
  
  if (currentRecords.length === 0) {
    showToast('该日期暂无记录', 'error')
    return
  }
  
  showClearConfirm.value = true
}

const confirmClear = async () => {
  const dateToClear = viewDate.value
  await saveRecords([], dateToClear)
  if (viewDate.value === dateToClear) {
    records.value = []
  }
  updateCalendar()
  showClearConfirm.value = false
  showToast(`${dateToClear} 的记录已全部清除`)
}
</script>

<template>
  <div class="min-h-screen p-4 md:p-8 relative flex items-center">
    <!-- 右上角工具栏 -->
    <transition name="fade">
      <div v-if="!showRecords" class="fixed top-4 right-4 z-50 flex items-center gap-2">
        <!-- 导入按钮 -->
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          @change="handleImport"
          class="hidden"
        />
        <button 
          class="btn btn-ghost text-[10px] py-1.5 px-3 border-border/50"
          @click="fileInputRef?.click()"
          title="导入记录"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17,8 12,3 7,8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          导入
        </button>
        
        <!-- 导出按钮 -->
        <button 
          class="btn btn-ghost text-[10px] py-1.5 px-3 border-border/50"
          @click="handleExport"
          title="导出记录"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          导出
        </button>

        <!-- 清除按钮 -->
        <button 
          class="btn btn-ghost text-[10px] py-1.5 px-3 border-danger/30 hover:border-danger/60 text-danger/70 hover:text-danger transition-all"
          @click="clearDayRecords"
          title="清除当日记录"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          清除
        </button>
        
        <!-- 历史记录按钮 -->
        <button 
          class="btn btn-ghost text-[10px] py-1.5 px-3 border-border/50 hover:border-primary/50"
          @click="toggleRecords"
          title="查看历史记录"
        >
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
      <div
        v-if="toast"
        :class="[
          'fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-lg shadow-2xl transition-all border-2 flex items-center gap-3 min-w-[240px] backdrop-blur-md',
          toast.type === 'success' ? 'bg-success/20 text-success border-success/50' : 'bg-danger/20 text-danger border-danger/50'
        ]"
      >
        <div :class="['w-2 h-2 rounded-full animate-pulse', toast.type === 'success' ? 'bg-success' : 'bg-danger']"></div>
        <span class="font-black uppercase tracking-widest text-xs">{{ toast.message }}</span>
      </div>
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
      <div class="flex flex-col gap-8 mb-12 items-center w-full">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <!-- 误报记录长方形框 -->
          <div class="card pulse-glow cursor-pointer hover:scale-[1.02] transition-all duration-300 py-12 px-10 flex items-center justify-between group border-success/20">
            <div class="text-left">
              <div class="text-sm uppercase tracking-[0.2em] text-muted-foreground font-bold mb-2 group-hover:text-success transition-colors">
                [ 误报记录统计 ]
              </div>
              <div class="text-xl font-black text-success glow-green tracking-widest">
                系统正常
              </div>
              <div class="mt-4 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                <span class="text-[10px] text-success/60 font-mono">状态: 稳定</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-8xl font-black text-success glow-green leading-none">{{ falsePositiveCount }}</div>
              <div class="mt-2 text-xs text-success font-mono opacity-50">发现记录</div>
            </div>
          </div>

          <!-- 威胁事件长方形框 -->
          <div class="card pulse-glow cursor-pointer hover:scale-[1.02] transition-all duration-300 py-12 px-10 flex items-center justify-between group border-danger/20">
            <div class="text-left">
              <div class="text-sm uppercase tracking-[0.2em] text-muted-foreground font-bold mb-2 group-hover:text-danger transition-colors">
                [ 威胁事件提报 ]
              </div>
              <div class="text-xl font-black text-danger glow-red tracking-widest">
                检测到威胁
              </div>
              <div class="mt-4 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-danger animate-ping"></span>
                <span class="text-[10px] text-danger/60 font-mono">状态: 警报</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-8xl font-black text-danger glow-red leading-none">{{ threatCount }}</div>
              <div class="mt-2 text-xs text-danger font-mono opacity-50">触发警报</div>
            </div>
          </div>
        </div>
      </div>

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
            <button 
              @click="toggleCalendar"
              class="text-lg font-mono font-black text-foreground hover:text-primary transition-all px-6 py-2 border-2 border-border rounded-lg hover:border-primary bg-background/50"
            >
              {{ viewDate }}
            </button>
            <button 
              v-if="viewDate !== getTodayString()"
              @click="goToToday"
              class="text-xs text-primary hover:underline font-black uppercase tracking-widest px-4 py-2 bg-primary/10 rounded-md border border-primary/30"
            >
              返回今日
            </button>
          </div>
        </div>
      </div>

      <!-- 日历选择器 -->
      <div v-if="showCalendar" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center" @click="showCalendar = false">
        <div class="bg-card border border-border rounded-xl p-6 shadow-2xl max-w-md w-full mx-4" @click.stop>
          <!-- 月份导航 -->
          <div class="flex items-center justify-between mb-4">
            <button @click="prevMonth" class="p-2 hover:bg-muted rounded-lg transition-colors">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
            </button>
            <h3 class="text-lg font-semibold">{{ monthTitle }}</h3>
            <button @click="nextMonth" class="p-2 hover:bg-muted rounded-lg transition-colors">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </button>
          </div>
          
          <!-- 星期标题 -->
          <div class="grid grid-cols-7 gap-1 mb-2">
            <div v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day" class="text-center text-sm font-medium text-muted-foreground py-2">
              {{ day }}
            </div>
          </div>
          
          <!-- 日期表格 -->
          <div class="grid grid-cols-7 gap-1">
            <button
              v-for="day in calendarDays"
              :key="day.date"
              @click="selectDate(day.date)"
              :class="[
                'relative p-2 rounded-lg text-center transition-all hover:bg-muted',
                !day.isCurrentMonth && 'text-muted-foreground opacity-50',
                day.date === viewDate && 'bg-primary text-primary-foreground font-bold',
                day.date === getTodayString() && day.date !== viewDate && 'border-2 border-primary',
                day.recordCount > 0 && 'font-semibold'
              ]"
            >
              <div class="text-sm">{{ day.day }}</div>
              <div v-if="day.recordCount > 0" class="text-xs text-primary mt-1">
                {{ day.recordCount }}条
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 w-full">
        <button 
          class="btn btn-success justify-center text-2xl py-10"
          @click="quickAddRecord('false_positive')"
        >
          <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <span class="font-black">记录误报</span>
        </button>
        <button 
          class="btn btn-danger justify-center text-2xl py-10"
          @click="quickAddRecord('threat')"
        >
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
    <transition name="slide-left">
      <div v-if="showRecords" class="fixed top-0 right-0 h-full w-full md:w-[500px] bg-card/95 backdrop-blur-xl border-l-2 border-primary/30 z-40 overflow-hidden shadow-2xl">
        <div class="h-full flex flex-col">
          <!-- 头部 -->
          <div class="flex items-center justify-between p-6 border-b-2 border-border">
            <div>
              <h2 class="text-xl font-black uppercase tracking-wider">
                <span class="text-primary">[</span> 历史记录 <span class="text-primary">]</span>
              </h2>
              <p class="text-xs text-muted-foreground mt-1 font-mono">
                <span class="text-primary">&gt;</span> {{ viewDate }} 
                <span v-if="viewDate === getTodayString()" class="text-success ml-2">[今日]</span>
                <span class="text-muted-foreground ml-2">{{ records.length }} 条记录</span>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button 
                v-if="records.length > 0"
                @click="handleBulkSwap"
                class="btn btn-ghost text-[9px] py-1 px-2 border-primary/30 hover:bg-primary/10 text-primary/70"
                title="对调当日所有类型"
              >
                全天对调
              </button>
              <button 
                @click="toggleRecords"
                class="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              >
                <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- 记录列表 -->
          <div class="flex-1 overflow-y-auto p-6">
            <div v-if="records.length === 0" class="text-center py-12 text-muted-foreground">
              <svg class="w-16 h-16 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p class="text-lg font-semibold mb-2">
                <span class="text-primary">[</span> {{ viewDate }} <span class="text-primary">]</span>
              </p>
              <p class="text-sm">该日期暂无记录</p>
              <p class="text-xs mt-2 text-muted-foreground/70">点击左侧按钮开始记录安全事件</p>
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="record in records"
                :key="record.id"
                class="record-item group"
              >
                <div :class="[
                  'p-2 rounded-lg',
                  record.type === 'threat' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                ]">
                  <svg v-if="record.type === 'threat'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4"/>
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span :class="['badge', record.type === 'threat' ? 'badge-danger' : 'badge-success']">
                      {{ record.type === 'threat' ? '威胁事件' : '误报' }}
                    </span>
                    <span
                      v-if="record.severity"
                      :class="[
                        'badge',
                        record.severity === 'low' ? 'bg-blue-500/20 text-blue-400 border-blue-500/60' :
                        record.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/60' :
                        record.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/60' :
                        'bg-danger/20 text-danger border-danger/60'
                      ]"
                    >
                      {{ severityLabels[record.severity] }}
                    </span>
                  </div>
                  <h3 class="font-medium text-foreground truncate">{{ record.title }}</h3>
                  <p v-if="record.description" class="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {{ record.description }}
                  </p>
                  <p class="text-xs text-muted-foreground mt-2 font-mono">{{ formatDate(record.timestamp) }}</p>
                </div>
                <div class="flex flex-col gap-1">
                  <button 
                    @click="handleToggleType(record.id)"
                    class="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-primary transition-all"
                    title="转换类型"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/>
                    </svg>
                  </button>
                  <button 
                    @click="handleDelete(record.id)"
                    class="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-danger transition-all"
                    title="删除记录"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3,6 5,6 21,6"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 侧边栏遮罩 -->
    <transition name="fade">
      <div v-if="showRecords" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" @click="toggleRecords"></div>
    </transition>

    <!-- 清除确认模态框 -->
    <transition name="fade">
      <div v-if="showClearConfirm" class="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4" @click="showClearConfirm = false">
        <div class="card max-w-sm w-full p-8 border-danger/30 text-center relative overflow-hidden" @click.stop>
          <!-- 背景装饰 -->
          <div class="absolute top-0 left-0 w-full h-1 bg-danger animate-pulse"></div>
          
          <div class="mb-6 inline-flex p-4 rounded-full bg-danger/10 text-danger">
            <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          
          <h3 class="text-xl font-black uppercase tracking-widest text-danger mb-2">危险操作确认</h3>
          <p class="text-sm text-muted-foreground mb-8">
            此操作将永久清除 <span class="text-foreground font-mono font-bold">{{ viewDate }}</span> 的所有研判记录数据。此过程不可逆！
          </p>
          
          <div class="flex flex-col gap-3">
            <button 
              @click="confirmClear"
              class="btn bg-danger hover:bg-danger/80 text-white border-none py-4 font-black tracking-widest uppercase flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              确认彻底删除
            </button>
            <button 
              @click="showClearConfirm = false"
              class="btn btn-ghost py-4 font-black tracking-widest uppercase"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
