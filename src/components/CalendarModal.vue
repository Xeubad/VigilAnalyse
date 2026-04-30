<script setup lang="ts">
interface CalendarDay {
  date: string
  day: number
  isCurrentMonth: boolean
  recordCount: number
}

defineProps<{
  viewDate: string
  calendarDays: CalendarDay[]
  monthTitle: string
  getTodayString: () => string
}>()

const emit = defineEmits<{
  close: []
  'select-date': [date: string]
  'prev-month': []
  'next-month': []
}>()
</script>

<template>
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center" @click="emit('close')">
    <div class="bg-card border border-border rounded-xl p-6 shadow-2xl max-w-md w-full mx-4" @click.stop>
      <!-- 月份导航 -->
      <div class="flex items-center justify-between mb-4">
        <button @click="emit('prev-month')" class="p-2 hover:bg-muted rounded-lg transition-colors">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </button>
        <h3 class="text-lg font-semibold">{{ monthTitle }}</h3>
        <button @click="emit('next-month')" class="p-2 hover:bg-muted rounded-lg transition-colors">
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
          @click="emit('select-date', day.date)"
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
</template>
