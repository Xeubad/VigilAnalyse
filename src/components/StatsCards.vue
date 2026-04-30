<script setup lang="ts">
defineProps<{
  falsePositiveCount: number
  threatCount: number
}>()
</script>

<template>
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
</template>
