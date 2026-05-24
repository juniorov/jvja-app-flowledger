<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useTransactionStore } from '@/stores/useTransactionStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import BalanceSummary from '@/shared/components/BalanceSummary.vue'
import { formatMonthYear, prevMonth, nextMonth } from '@/shared/utils/formatters'

const store = useTransactionStore()
const workspaceStore = useWorkspaceStore()

const currency = computed(() => workspaceStore.workspace?.baseCurrency ?? 'CRC')

function goToPrevMonth() {
  const { year, month } = prevMonth(store.currentYear, store.currentMonth)
  store.subscribe(workspaceStore.workspaceId, year, month)
}

function goToNextMonth() {
  const { year, month } = nextMonth(store.currentYear, store.currentMonth)
  store.subscribe(workspaceStore.workspaceId, year, month)
}

const isCurrentMonth = () => {
  const now = new Date()
  return store.currentYear === now.getFullYear() && store.currentMonth === now.getMonth() + 1
}

onMounted(() => {
  store.subscribe(workspaceStore.workspaceId, store.currentYear, store.currentMonth)
})

onUnmounted(() => {
  store.unsubscribe()
})
</script>

<template>
  <div class="flex flex-col min-h-full">

    <!-- Header -->
    <header class="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-4 pt-4 pb-3">
      <h1 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Balance</h1>

      <!-- Selector de período -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
          @click="goToPrevMonth"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <span class="flex-1 text-center text-sm font-semibold text-gray-800 dark:text-gray-200">
          {{ formatMonthYear(store.currentYear, store.currentMonth) }}
        </span>

        <button
          type="button"
          :disabled="isCurrentMonth()"
          class="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition min-h-[36px] min-w-[36px] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          @click="goToNextMonth"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Contenido -->
    <div class="flex-1 px-4 py-4">

      <!-- Loading skeleton -->
      <div v-if="store.loading" class="space-y-3">
        <div class="grid grid-cols-2 gap-2">
          <div class="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div class="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
        <div class="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div class="h-40 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>

      <!-- Error -->
      <div v-else-if="store.error" class="py-10 text-center">
        <p class="text-sm text-danger-600 dark:text-danger-400">{{ store.error }}</p>
        <button
          class="mt-2 text-sm text-primary-600 dark:text-primary-400 font-medium"
          @click="store.subscribe(workspaceStore.workspaceId, store.currentYear, store.currentMonth)"
        >
          Reintentar
        </button>
      </div>

      <!-- Sin datos -->
      <div v-else-if="store.transactions.length === 0" class="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Sin datos</p>
          <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">
            No hay transacciones en {{ formatMonthYear(store.currentYear, store.currentMonth) }}.
          </p>
        </div>
        <RouterLink
          to="/movimientos/nueva"
          class="px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold min-h-[44px] flex items-center"
        >
          Agregar primera transacción
        </RouterLink>
      </div>

      <!-- Resumen de balance -->
      <BalanceSummary
        v-else
        :total-income="store.totalIncome"
        :total-expense="store.totalExpense"
        :balance="store.balance"
        :distributable-income="store.distributableIncome"
        :total-fixed-costs="store.totalFixedCosts"
        :net-distributable="store.netDistributable"
        :currency="currency"
        :show-distribution="true"
      />

    </div>
  </div>
</template>
