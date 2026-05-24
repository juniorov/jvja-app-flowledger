<script setup>
import CurrencyBadge from './CurrencyBadge.vue'
import { formatAmount, formatDateShort } from '@/shared/utils/formatters'

const props = defineProps({
  transaction: {
    type: Object,
    required: true,
  },
})

defineEmits(['tap'])

const tx = props.transaction
const isIncome = tx.type === 'income'
const amount = isIncome ? tx.credit : tx.debit
const displayText = tx.notes?.trim() || tx.description || '—'
const hasNotes = tx.notes?.trim() && tx.notes.trim() !== tx.description
</script>

<template>
  <button
    type="button"
    class="w-full text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3.5 flex items-center gap-3 active:bg-gray-50 dark:active:bg-gray-700/70 transition-colors"
    @click="$emit('tap', transaction)"
  >
    <!-- Indicador de tipo -->
    <div
      class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      :class="isIncome
        ? 'bg-success-50 dark:bg-success-500/10'
        : 'bg-danger-50 dark:bg-danger-500/10'"
    >
      <svg
        class="w-4 h-4"
        :class="isIncome ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
      >
        <!-- Flecha arriba = ingreso, abajo = gasto -->
        <template v-if="isIncome">
          <line x1="12" y1="19" x2="12" y2="5"/>
          <polyline points="5 12 12 5 19 12"/>
        </template>
        <template v-else>
          <line x1="12" y1="5" x2="12" y2="19"/>
          <polyline points="19 12 12 19 5 12"/>
        </template>
      </svg>
    </div>

    <!-- Descripción -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-gray-900 dark:text-white truncate leading-snug">
        {{ displayText }}
      </p>
      <div class="flex items-center gap-1.5 mt-0.5">
        <span class="text-[11px] text-gray-400 dark:text-gray-500">{{ formatDateShort(transaction.date) }}</span>
        <template v-if="transaction.code">
          <span class="text-gray-200 dark:text-gray-600">·</span>
          <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase">{{ transaction.code }}</span>
        </template>
        <template v-if="transaction.isDistributable">
          <span class="text-gray-200 dark:text-gray-600">·</span>
          <span class="text-[10px] font-semibold text-primary-600 dark:text-primary-400">dist.</span>
        </template>
      </div>
    </div>

    <!-- Monto + moneda -->
    <div class="shrink-0 text-right">
      <p
        class="text-sm font-bold tabular-nums"
        :class="isIncome
          ? 'text-success-600 dark:text-success-400'
          : 'text-danger-600 dark:text-danger-400'"
      >
        {{ isIncome ? '+' : '−' }}{{ formatAmount(amount, transaction.currency) }}
      </p>
      <CurrencyBadge :currency="transaction.currency" class="mt-0.5" />
    </div>
  </button>
</template>
