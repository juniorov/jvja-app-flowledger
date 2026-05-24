<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useTransactionStore } from '@/stores/useTransactionStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { formatAmount, formatMonthYear, prevMonth, nextMonth } from '@/shared/utils/formatters'

const store = useTransactionStore()
const workspaceStore = useWorkspaceStore()

const currency = computed(() => workspaceStore.workspace?.baseCurrency ?? 'CRC')

// Separar participantes por tipo
const companyParticipant = computed(() =>
  workspaceStore.workspace?.partners?.find((p) => p.type === 'company' || p.id === 'company') ?? null
)

const partnerParticipants = computed(() =>
  (workspaceStore.workspace?.partners ?? []).filter((p) => p.type === 'partner' && p.id !== 'company')
)

function participantAmount(percentage) {
  return (store.netDistributable * percentage) / 100
}

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
    <header class="sticky top-0 z-10 bg-white border-b border-neutral-100 px-4 pt-4 pb-3">
      <h1 class="text-xl font-bold text-neutral-900 mb-3">Liquidación</h1>

      <!-- Selector de período -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
          @click="goToPrevMonth"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span class="flex-1 text-center text-sm font-semibold text-neutral-800">
          {{ formatMonthYear(store.currentYear, store.currentMonth) }}
        </span>
        <button
          type="button"
          :disabled="isCurrentMonth()"
          class="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition min-h-[36px] min-w-[36px] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          @click="goToNextMonth"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </header>

    <div class="flex-1 px-4 py-4 space-y-4">

      <!-- Loading -->
      <div v-if="store.loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-20 rounded-xl bg-neutral-100 animate-pulse" />
      </div>

      <!-- Sin datos distribuibles -->
      <div
        v-else-if="store.netDistributable <= 0"
        class="flex flex-col items-center justify-center py-16 gap-3 text-center"
      >
        <div class="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center">
          <svg class="w-7 h-7 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p class="text-sm font-medium text-neutral-600">Sin ingresos distribuibles</p>
        <p class="text-sm text-neutral-400">
          No hay transacciones marcadas como distribuibles en
          {{ formatMonthYear(store.currentYear, store.currentMonth) }}.
        </p>
      </div>

      <!-- Distribución -->
      <template v-else>

        <!-- Resumen base -->
        <div class="bg-white rounded-xl border border-neutral-200 shadow-sm px-4 py-3 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-xs text-neutral-400">Ingresos distribuibles</span>
            <span class="text-sm font-semibold text-neutral-900 tabular-nums">
              {{ formatAmount(store.distributableIncome, currency) }}
            </span>
          </div>
          <div v-if="store.totalFixedCosts > 0" class="flex items-center justify-between">
            <span class="text-xs text-neutral-400">− Costos fijos</span>
            <span class="text-sm font-semibold text-status-error tabular-nums">
              − {{ formatAmount(store.totalFixedCosts, currency) }}
            </span>
          </div>
          <div class="flex items-center justify-between pt-1.5 border-t border-neutral-100">
            <span class="text-sm font-bold text-neutral-700">Neto a repartir</span>
            <span class="text-lg font-extrabold text-neutral-900 tabular-nums">
              {{ formatAmount(store.netDistributable, currency) }}
            </span>
          </div>
        </div>

        <!-- ── Sección 1: Capital empresa ─────────────────────── -->
        <div v-if="companyParticipant">
          <div class="flex items-center gap-2 mb-2 px-1">
            <div class="w-4 h-4 rounded bg-primary/10 flex items-center justify-center shrink-0">
              <svg class="w-2.5 h-2.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
            </div>
            <p class="text-xs font-bold text-primary uppercase tracking-wide">Capital empresa</p>
          </div>

          <div class="bg-white rounded-xl border border-neutral-200 shadow-sm px-4 py-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-base font-semibold text-neutral-900">{{ companyParticipant.name }}</p>
                <p class="text-sm text-neutral-400">{{ companyParticipant.percentage }}% del neto</p>
              </div>
              <div class="text-right">
                <p class="text-xl font-extrabold text-primary tabular-nums">
                  {{ formatAmount(participantAmount(companyParticipant.percentage), currency) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Sección 2: Distribución socios ────────────────── -->
        <div v-if="partnerParticipants.length > 0">
          <div class="flex items-center gap-2 mb-2 px-1">
            <div class="w-4 h-4 rounded bg-secondary-purple/10 flex items-center justify-center shrink-0">
              <svg class="w-2.5 h-2.5 text-secondary-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p class="text-xs font-bold text-secondary-purple uppercase tracking-wide">Distribución socios</p>
          </div>

          <div class="bg-white rounded-xl border border-neutral-200 shadow-sm divide-y divide-neutral-100 overflow-hidden">
            <div
              v-for="partner in partnerParticipants"
              :key="partner.id"
              class="px-4 py-4 flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-secondary-purple/10 flex items-center justify-center shrink-0">
                  <span class="text-xs font-bold text-secondary-purple">
                    {{ (partner.name || '?')[0].toUpperCase() }}
                  </span>
                </div>
                <div>
                  <p class="text-sm font-semibold text-neutral-900">{{ partner.name }}</p>
                  <p class="text-xs text-neutral-400">
                    {{ partner.percentage }}% ·
                    {{ partner.email || 'sin email' }}
                  </p>
                </div>
              </div>
              <div class="text-right shrink-0">
                <p class="text-base font-bold text-neutral-900 tabular-nums">
                  {{ formatAmount(participantAmount(partner.percentage), currency) }}
                </p>
              </div>
            </div>
          </div>
        </div>

      </template>
    </div>
  </div>
</template>
