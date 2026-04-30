<script setup lang="ts">
defineProps<{
  message: string
  type: 'success' | 'error'
}>()
</script>

<template>
  <div
    :class="[
      'fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-lg shadow-2xl transition-all border-2 flex items-center gap-3 min-w-[240px] backdrop-blur-md',
      type === 'success' ? 'bg-success/20 text-success border-success/50' : 'bg-danger/20 text-danger border-danger/50'
    ]"
  >
    <div :class="['w-2 h-2 rounded-full animate-pulse', type === 'success' ? 'bg-success' : 'bg-danger']"></div>
    <span class="font-black uppercase tracking-widest text-xs">{{ message }}</span>
  </div>
</template>
