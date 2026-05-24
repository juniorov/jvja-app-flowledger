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
</script>

<template>
  <!--
    overflow-hidden: clip duro para que nada dentro del card escape su borde.
    min-w-0: necesario cuando el botón es item de un flex/grid — previene que
             el contenido interno fuerce al botón a ser más ancho que su celda.
  -->
  <button
    type="button"
    class="w-full min-w-0 overflow-hidden text-left bg-white rounded-2xl border border-neutral-100
           px-4 py-3.5 flex items-center gap-3 active:bg-neutral-50 transition-colors hover:border-neutral-200"
    @click="$emit('tap', transaction)"
  >
    <!-- Indicador de tipo (tamaño fijo, no encoge) -->
    <div
      class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      :class="isIncome ? 'bg-status-success/10' : 'bg-status-error/10'"
    >
      <svg
        class="w-4 h-4"
        :class="isIncome ? 'text-status-success' : 'text-status-error'"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round"
      >
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

    <!--
      Columna central: flex-1 + min-w-0 permite que encoja.
      overflow-hidden en el contenedor es el clip final para el texto.
    -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-neutral-900 truncate leading-snug">
        {{ displayText }}
      </p>
      <div class="flex items-center gap-1.5 mt-0.5">
        <span class="text-[11px] text-neutral-400 shrink-0">{{ formatDateShort(transaction.date) }}</span>
        <template v-if="transaction.code">
          <span class="text-neutral-200 shrink-0">·</span>
          <span class="text-[11px] font-medium text-neutral-500 uppercase shrink-0">{{ transaction.code }}</span>
        </template>
        <template v-if="transaction.isDistributable">
          <span class="text-neutral-200 shrink-0">·</span>
          <span class="text-[10px] font-semibold text-primary shrink-0">dist.</span>
        </template>
      </div>
    </div>

    <!--
      Columna derecha: shrink-0 para que nunca encoja.
      whitespace-nowrap evita que el monto se parta en dos líneas
      (Intl.NumberFormat en es-CR usa espacios de no separación como separador de miles).
    -->
    <div class="shrink-0 text-right pl-1">
      <p
        class="text-sm font-bold tabular-nums whitespace-nowrap"
        :class="isIncome ? 'text-status-success' : 'text-status-error'"
      >
        {{ isIncome ? '+' : '−' }}{{ formatAmount(amount, transaction.currency) }}
      </p>
      <CurrencyBadge :currency="transaction.currency" class="mt-0.5" />
    </div>
  </button>
</template>
