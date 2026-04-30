<script setup lang="ts">
defineProps<{
  viewDate: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4" @click="emit('cancel')">
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
          @click="emit('confirm')"
          class="btn bg-danger hover:bg-danger/80 text-white border-none py-4 font-black tracking-widest uppercase flex items-center justify-center gap-2"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          确认彻底删除
        </button>
        <button
          @click="emit('cancel')"
          class="btn btn-ghost py-4 font-black tracking-widest uppercase"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>
