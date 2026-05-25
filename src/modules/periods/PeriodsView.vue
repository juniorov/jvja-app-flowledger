<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { useTransactionStore } from '@/stores/useTransactionStore'
import { usePeriods, groupTransactionsByPeriod } from '@/composables/usePeriods'
import { formatMonthYear, formatAmount } from '@/shared/utils/formatters'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// Reutilizar la misma conversión que usePeriods, sin importarla (es local allá)
function toDate(value) {
  if (!value) return new Date()
  if (value?.toDate) return value.toDate()
  if (value instanceof Date) return value
  return new Date(value)
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const workspaceStore = useWorkspaceStore()
const txStore = useTransactionStore()
const { transactions, loading, error, subscribe, unsubscribe } = usePeriods()

const partners = computed(() => workspaceStore.workspace?.partners ?? [])

const allPeriods = computed(() =>
  groupTransactionsByPeriod(transactions.value, partners.value)
)

/** Períodos filtrados por moneda — respeta el filtro compartido del store. */
const periods = computed(() => {
  if (txStore.currencyFilter === 'all') return allPeriods.value
  return allPeriods.value
    .map((p) => ({
      ...p,
      currencies: p.currencies.filter((c) => c.currency === txStore.currencyFilter),
    }))
    .filter((p) => p.currencies.length > 0)
})

// ── Balance Global ─────────────────────────────────────────────────────────────

const globalStats = computed(() => {
  const stats = {
    CRC: { income: 0, expense: 0 },
    USD: { income: 0, expense: 0 },
  }
  for (const tx of transactions.value) {
    const cur = tx.currency || 'CRC'
    if (cur === 'CRC' || cur === 'USD') {
      stats[cur].income += tx.credit || 0
      stats[cur].expense += tx.debit || 0
    }
  }
  return {
    CRC: { ...stats.CRC, balance: stats.CRC.income - stats.CRC.expense },
    USD: { ...stats.USD, balance: stats.USD.income - stats.USD.expense },
  }
})

const hasData = computed(() => transactions.value.length > 0)

// ── Gráfico ────────────────────────────────────────────────────────────────────

const availableYears = computed(() => {
  const years = new Set()
  for (const tx of transactions.value) {
    years.add(toDate(tx.date).getFullYear())
  }
  return [...years].sort((a, b) => b - a)
})

const selectedYear = ref(new Date().getFullYear())
const chartCurrency = ref('CRC')

// Ajustar el año seleccionado si no hay datos para el año actual
watch(
  availableYears,
  (years) => {
    if (years.length && !years.includes(selectedYear.value)) {
      selectedYear.value = years[0]
    }
  },
  { immediate: true }
)

const monthlyChartData = computed(() => {
  const months = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }))
  for (const tx of transactions.value) {
    const d = toDate(tx.date)
    if (d.getFullYear() !== selectedYear.value) continue
    const cur = tx.currency || 'CRC'
    if (cur !== chartCurrency.value) continue
    months[d.getMonth()].income += tx.credit || 0
    months[d.getMonth()].expense += tx.debit || 0
  }
  return months
})

const barChartData = computed(() => ({
  labels: MONTH_LABELS,
  datasets: [
    {
      label: 'Ingresos',
      data: monthlyChartData.value.map((m) => m.income),
      backgroundColor: '#31D472',
      borderRadius: 4,
      borderSkipped: false,
    },
    {
      label: 'Egresos',
      data: monthlyChartData.value.map((m) => m.expense),
      backgroundColor: '#EB0000',
      borderRadius: 4,
      borderSkipped: false,
    },
  ],
}))

const barChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) =>
          `${ctx.dataset.label}: ${formatAmount(ctx.parsed.y, chartCurrency.value)}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 10 }, color: '#6B6B6B' },
    },
    y: {
      grid: { color: '#EBEBEB', lineWidth: 1 },
      border: { dash: [4, 4] },
      ticks: {
        font: { size: 10 },
        color: '#6B6B6B',
        maxTicksLimit: 5,
        callback: (val) => {
          if (!val) return '0'
          const sym = chartCurrency.value === 'USD' ? '$' : '₡'
          if (val >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(1)}M`
          if (val >= 1_000) return `${sym}${(val / 1_000).toFixed(0)}K`
          return `${sym}${val}`
        },
      },
    },
  },
}))

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
    <header class="sticky top-0 z-10 bg-white border-b border-neutral-100 px-4 pt-4 pb-3 space-y-3">
      <h1 class="text-xl font-bold text-neutral-900">Dashboard</h1>
      <!-- Filtro de moneda (para la lista de períodos) -->
      <div class="flex gap-1 bg-neutral-100 rounded-xl p-1">
        <button
          v-for="opt in [{ v: 'all', l: 'Todos' }, { v: 'CRC', l: '₡ CRC' }, { v: 'USD', l: '$ USD' }]"
          :key="opt.v"
          type="button"
          class="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
          :class="txStore.currencyFilter === opt.v
            ? 'bg-white text-neutral-900 shadow-sm'
            : 'text-neutral-500 hover:text-neutral-700'"
          @click="txStore.setCurrencyFilter(opt.v)"
        >
          {{ opt.l }}
        </button>
      </div>
    </header>

    <div class="flex-1 px-4 py-4 space-y-5">

      <!-- Loading skeleton -->
      <div v-if="loading" class="space-y-4">
        <div class="rounded-2xl bg-neutral-100 animate-pulse h-32" />
        <div class="rounded-2xl bg-neutral-100 animate-pulse h-64" />
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
      <div v-else-if="!hasData" class="flex flex-col items-center justify-center py-16 gap-4 text-center">
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

      <!-- Contenido principal -->
      <template v-else>

        <!-- ── Balance Global ──────────────────────────────────────────────── -->
        <section class="space-y-3">
          <h2 class="text-xs font-bold text-neutral-400 uppercase tracking-widest">Balance Global</h2>

          <!-- Saldos totales -->
          <div class="grid grid-cols-2 gap-3">
            <div
              class="rounded-2xl p-4 text-white space-y-1"
              :class="globalStats.CRC.balance >= 0
                ? 'bg-gradient-to-br from-primary to-[#00BDB0]'
                : 'bg-gradient-to-br from-status-error to-red-400'"
            >
              <p class="text-[10px] font-bold uppercase tracking-wider opacity-80">Saldo CRC</p>
              <p class="text-base font-extrabold tabular-nums leading-tight break-all">
                {{ formatAmount(globalStats.CRC.balance, 'CRC') }}
              </p>
            </div>
            <div
              class="rounded-2xl p-4 text-white space-y-1"
              :class="globalStats.USD.balance >= 0
                ? 'bg-gradient-to-br from-primary to-[#00BDB0]'
                : 'bg-gradient-to-br from-status-error to-red-400'"
            >
              <p class="text-[10px] font-bold uppercase tracking-wider opacity-80">Saldo USD</p>
              <p class="text-base font-extrabold tabular-nums leading-tight break-all">
                {{ formatAmount(globalStats.USD.balance, 'USD') }}
              </p>
            </div>
          </div>

          <!-- Ingresos y egresos CRC -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-green-50 rounded-xl px-3 py-2.5">
              <p class="text-[10px] font-semibold text-status-success uppercase tracking-wide">Ingresos CRC</p>
              <p class="text-sm font-bold text-status-success tabular-nums mt-0.5 truncate">
                {{ formatAmount(globalStats.CRC.income, 'CRC') }}
              </p>
            </div>
            <div class="bg-red-50 rounded-xl px-3 py-2.5">
              <p class="text-[10px] font-semibold text-status-error uppercase tracking-wide">Egresos CRC</p>
              <p class="text-sm font-bold text-status-error tabular-nums mt-0.5 truncate">
                {{ formatAmount(globalStats.CRC.expense, 'CRC') }}
              </p>
            </div>
          </div>

          <!-- Ingresos y egresos USD -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-green-50 rounded-xl px-3 py-2.5">
              <p class="text-[10px] font-semibold text-status-success uppercase tracking-wide">Ingresos USD</p>
              <p class="text-sm font-bold text-status-success tabular-nums mt-0.5 truncate">
                {{ formatAmount(globalStats.USD.income, 'USD') }}
              </p>
            </div>
            <div class="bg-red-50 rounded-xl px-3 py-2.5">
              <p class="text-[10px] font-semibold text-status-error uppercase tracking-wide">Egresos USD</p>
              <p class="text-sm font-bold text-status-error tabular-nums mt-0.5 truncate">
                {{ formatAmount(globalStats.USD.expense, 'USD') }}
              </p>
            </div>
          </div>
        </section>

        <!-- ── Gráfico ─────────────────────────────────────────────────────── -->
        <section class="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 space-y-3">

          <!-- Header del gráfico -->
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-neutral-900">Ingresos vs Egresos</h2>
            <!-- Selector de año (solo si hay más de uno) -->
            <select
              v-if="availableYears.length > 1"
              v-model="selectedYear"
              class="text-xs font-semibold text-neutral-700 border border-neutral-200 rounded-lg px-2 py-1.5 bg-white min-h-[36px] focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
            </select>
            <span v-else class="text-xs font-semibold text-neutral-500">{{ selectedYear }}</span>
          </div>

          <!-- Tabs CRC / USD -->
          <div class="flex gap-1 bg-neutral-100 rounded-xl p-1">
            <button
              v-for="cur in ['CRC', 'USD']"
              :key="cur"
              type="button"
              class="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              :class="chartCurrency === cur
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'"
              @click="chartCurrency = cur"
            >
              {{ cur === 'CRC' ? '₡ CRC' : '$ USD' }}
            </button>
          </div>

          <!-- Leyenda manual -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-3 rounded-sm bg-[#31D472]" />
              <span class="text-[10px] font-medium text-neutral-500">Ingresos</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-3 rounded-sm bg-[#EB0000]" />
              <span class="text-[10px] font-medium text-neutral-500">Egresos</span>
            </div>
          </div>

          <!-- Gráfico de barras — scrolleable horizontalmente en mobile -->
          <div class="overflow-x-auto -mx-1 px-1">
            <div class="min-w-[560px] h-48">
              <Bar :data="barChartData" :options="barChartOptions" />
            </div>
          </div>
        </section>

        <!-- ── Lista de períodos ───────────────────────────────────────────── -->
        <section class="space-y-4">
          <h2 class="text-xs font-bold text-neutral-400 uppercase tracking-widest">Por período</h2>

          <!-- Sin períodos para el filtro activo -->
          <div
            v-if="periods.length === 0"
            class="flex flex-col items-center py-10 gap-2 text-center"
          >
            <p class="text-sm text-neutral-400">Sin períodos para la moneda seleccionada.</p>
          </div>

          <!-- Cards de período -->
          <div
            v-for="period in periods"
            :key="period.key"
            class="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden"
          >
            <!-- Cabecera del período -->
            <div class="px-4 pt-4 pb-3 border-b border-neutral-100">
              <h3 class="text-base font-bold text-neutral-900">
                {{ formatMonthYear(period.year, period.month) }}
              </h3>
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
                  <div v-if="c.totalTax > 0" class="flex items-center justify-between">
                    <span class="text-[10px] text-neutral-400">− Impuesto (13%)</span>
                    <span class="text-[10px] font-medium text-status-error tabular-nums">
                      − {{ formatAmount(c.totalTax, c.currency) }}
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
        </section>

      </template>

    </div>
  </div>
</template>
