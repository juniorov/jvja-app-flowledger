<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { usePeriods, groupTransactionsByPeriod } from '@/composables/usePeriods'
import { formatMonthYear, formatAmount } from '@/shared/utils/formatters'

const workspaceStore = useWorkspaceStore()
const { transactions, loading, error, subscribe, unsubscribe } = usePeriods()

const partners = computed(() => workspaceStore.workspace?.partners ?? [])

const periods = computed(() =>
  groupTransactionsByPeriod(transactions.value, partners.value)
)

onMounted(() => {
  subscribe(workspaceStore.workspaceId)
})

onUnmounted(() => {
  unsubscribe()
})
</script>

<template>
  <div class="flex flex-col min-h-full">

    <!-- Header -->
    <header class="sticky top-0 z-10 bg-white border-b border-neutral-100 px-4 pt-4 pb-3">
      <h1 class="text-xl font-bold text-neutral-900">Balance</h1>
    </header>

    <div class="flex-1 px-4 py-4 space-y-4">

      <!-- Loading skeleton -->
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="rounded-2xl bg-neutral-100 animate-pulse h-44" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div class="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
          <svg class="w-6 h-6 text-status-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p class="text-sm text-status-error font-medium">{{ error }}</p>
        <button
          class="text-sm text-primary font-semibold"
          @click="subscribe(workspaceStore.workspaceId)"
        >
          Reintentar
        </button>
      </div>

      <!-- Empty state -->
      <div v-else-if="periods.length === 0" class="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div class="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-neutral-600">Sin datos</p>
          <p class="text-sm text-neutral-400 mt-1">Aún no hay transacciones registradas.</p>
        </div>
        <RouterLink
          to="/movimientos/nueva"
          class="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold min-h-[44px] flex items-center"
        >
          Agregar primera transacción
        </RouterLink>
      </div>

      <!-- Lista de períodos -->
      <template v-else>
        <div
          v-for="period in periods"
          :key="period.key"
          class="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden"
        >
          <!-- Cabecera del período -->
          <div class="px-4 pt-4 pb-3 border-b border-neutral-100">
            <h2 class="text-base font-bold text-neutral-900">
              {{ formatMonthYear(period.year, period.month) }}
            </h2>
          </div>

          <!-- Sección por moneda -->
          <div
            v-for="(c, idx) in period.currencies"
            :key="c.currency"
            :class="idx > 0 ? 'border-t border-neutral-100' : ''"
            class="px-4 pt-3 pb-4 space-y-3"
          >
            <!-- Badge de moneda (solo si hay más de una) -->
            <div v-if="period.currencies.length > 1" class="flex items-center gap-1.5">
              <span
                class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                :class="c.currency === 'USD'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-primary/10 text-primary'"
              >
                {{ c.currency }}
              </span>
            </div>

            <!-- Ingresos / Egresos -->
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-green-50 rounded-xl px-3 py-2.5">
                <p class="text-[10px] font-semibold text-status-success uppercase tracking-wide">Ingresos</p>
                <p class="text-sm font-bold text-status-success tabular-nums mt-0.5 truncate">
                  {{ formatAmount(c.totalIncome, c.currency) }}
                </p>
              </div>
              <div class="bg-red-50 rounded-xl px-3 py-2.5">
                <p class="text-[10px] font-semibold text-status-error uppercase tracking-wide">Egresos</p>
                <p class="text-sm font-bold text-status-error tabular-nums mt-0.5 truncate">
                  {{ formatAmount(c.totalExpense, c.currency) }}
                </p>
              </div>
            </div>

            <!-- Balance neto -->
            <div
              class="rounded-xl px-3 py-2.5 flex items-center justify-between"
              :class="c.balance >= 0 ? 'bg-primary/10' : 'bg-red-50'"
            >
              <span
                class="text-xs font-semibold uppercase tracking-wide"
                :class="c.balance >= 0 ? 'text-primary' : 'text-status-error'"
              >
                Balance neto
              </span>
              <span
                class="text-base font-extrabold tabular-nums"
                :class="c.balance >= 0 ? 'text-primary' : 'text-status-error'"
              >
                {{ formatAmount(c.balance, c.currency) }}
              </span>
            </div>

            <!-- Distribución (solo si hay monto distribuible) -->
            <template v-if="c.netDistributable > 0">

              <!-- Detalle base distribuible -->
              <div class="rounded-xl border border-neutral-100 px-3 py-2.5 space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">Distribuible</span>
                  <span class="text-xs font-semibold text-neutral-700 tabular-nums">
                    {{ formatAmount(c.distributableIncome, c.currency) }}
                  </span>
                </div>
                <div v-if="c.totalFixedCosts > 0" class="flex items-center justify-between">
                  <span class="text-[10px] text-neutral-400">− Costos fijos</span>
                  <span class="text-[10px] font-medium text-status-error tabular-nums">
                    − {{ formatAmount(c.totalFixedCosts, c.currency) }}
                  </span>
                </div>
                <div class="flex items-center justify-between pt-1.5 border-t border-neutral-100">
                  <span class="text-[10px] font-semibold text-neutral-600">Neto a repartir</span>
                  <span class="text-xs font-bold text-neutral-900 tabular-nums">
                    {{ formatAmount(c.netDistributable, c.currency) }}
                  </span>
                </div>
              </div>

              <!-- Capital empresa -->
              <div
                v-if="c.distribution.some(d => d.type === 'company')"
                class="rounded-xl border border-neutral-100 overflow-hidden"
              >
                <div class="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b border-neutral-100">
                  <div class="w-3.5 h-3.5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <svg class="w-2 h-2 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <rect x="2" y="7" width="20" height="14" rx="2"/>
                      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    </svg>
                  </div>
                  <span class="text-[10px] font-semibold text-primary uppercase tracking-wide">Capital empresa</span>
                </div>
                <div
                  v-for="d in c.distribution.filter(d => d.type === 'company')"
                  :key="d.id"
                  class="flex items-center justify-between px-3 py-2.5"
                >
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-medium text-neutral-700">{{ d.name }}</span>
                    <span class="text-[10px] text-neutral-400">{{ d.percentage }}%</span>
                  </div>
                  <span class="text-sm font-bold text-primary tabular-nums">
                    {{ formatAmount(d.amount, c.currency) }}
                  </span>
                </div>
              </div>

              <!-- Distribución socios -->
              <div
                v-if="c.distribution.some(d => d.type === 'partner')"
                class="rounded-xl border border-neutral-100 overflow-hidden"
              >
                <div class="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b border-neutral-100">
                  <div class="w-3.5 h-3.5 rounded bg-secondary-purple/10 flex items-center justify-center shrink-0">
                    <svg class="w-2 h-2 text-secondary-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <span class="text-[10px] font-semibold text-secondary-purple uppercase tracking-wide">Socios</span>
                </div>
                <div class="divide-y divide-neutral-100">
                  <div
                    v-for="d in c.distribution.filter(d => d.type === 'partner')"
                    :key="d.id"
                    class="flex items-center justify-between px-3 py-2.5"
                  >
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full bg-secondary-purple/10 flex items-center justify-center shrink-0">
                        <span class="text-[9px] font-bold text-secondary-purple">
                          {{ (d.name || '?')[0].toUpperCase() }}
                        </span>
                      </div>
                      <div>
                        <span class="text-xs font-medium text-neutral-700">{{ d.name }}</span>
                        <span class="text-[10px] text-neutral-400 ml-1">{{ d.percentage }}%</span>
                      </div>
                    </div>
                    <span class="text-sm font-bold text-neutral-900 tabular-nums">
                      {{ formatAmount(d.amount, c.currency) }}
                    </span>
                  </div>
                </div>
              </div>

            </template>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>
