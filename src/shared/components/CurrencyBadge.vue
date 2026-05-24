<script setup>
defineProps({
  currency: {
    type: String,
    default: 'CRC',
    validator: (v) => ['CRC', 'USD'].includes(v),
  },
})
</script>

<template>
  <span
    class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide"
    :class="currency === 'CRC'
      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'"
  >
    {{ currency }}
  </span>
</template>
