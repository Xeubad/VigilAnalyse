<script setup lang="ts">
import { SecurityRecord, formatDate } from '../utils/storage'

const severityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重'
}

defineProps<{
  show: boolean
  records: SecurityRecord[]
  viewDate: string
  getTodayString: () => string
}>()

const emit = defineEmits<{
  close: []
  delete: [id: string]
  'toggle-type': [id: string]
  'bulk-swap': []
}>()
</script>

<template>
  <!-- 侧边栏遮罩 -->
  <transition name="fade">
    <div v-if="show" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" @click="emit('close')"></div>
  </transition>

  <!-- 侧边栏主体 -->
  <transition name="slide-left">
    <div v-if="show" class="fixed top-0 right-0 h-full w-full md:w-[500px] bg-card/95 backdrop-blur-xl border-l-2 border-primary/30 z-40 overflow-hidden shadow-2xl">
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
              @click="emit('bulk-swap')"
              class="btn btn-ghost text-[9px] py-1 px-2 border-primary/30 hover:bg-primary/10 text-primary/70"
              title="对调当日所有类型"
            >
              全天对调
            </button>
            <button
              @click="emit('close')"
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
                  @click="emit('toggle-type', record.id)"
                  class="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-primary transition-all"
                  title="转换类型"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/>
                  </svg>
                </button>
                <button
                  @click="emit('delete', record.id)"
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
</template>
