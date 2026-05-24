<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTransactionStore } from '@/stores/useTransactionStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { computeDistribution } from '@/composables/useDistribution'
import { formatAmount, formatMonthYear, formatDateShort, prevMonth, nextMonth } from '@/shared/utils/formatters'

const store = useTransactionStore()
const workspaceStore = useWorkspaceStore()

const distributionError = ref('')
const partners = computed(() => workspaceStore.workspace?.partners ?? [])

// ── Distribución calculada ────────────────────────────────────────────────────

const distribution = computed(() => {
  try {
    distributionError.value = ''
    return computeDistribution(store.transactions, partners.value)
  } catch (e) {
    distributionError.value = e.message
    return {}
  }
})

const currencies = computed(() => Object.keys(distribution.value))
const hasData = computed(() => currencies.value.length > 0)

// Ingresos totales del mes por moneda (para resumen)
const incomeByCurrency = computed(() => {
  const map = {}
  for (const tx of store.transactions) {
    if (tx.type !== 'income') continue
    const c = tx.currency || 'CRC'
    map[c] = (map[c] || 0) + (tx.credit || 0)
  }
  return map
})

// ── Colapsibles ───────────────────────────────────────────────────────────────

const expandedKeys = ref(new Set())

function toggleExpand(currency, participantId) {
  const key = `${currency}__${participantId}`
  const next = new Set(expandedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedKeys.value = next
}

function isExpanded(currency, participantId) {
  return expandedKeys.value.has(`${currency}__${participantId}`)
}

// ── Exportar / Compartir ──────────────────────────────────────────────────────

const copied = ref(false)

async function copyShareText() {
  const text = buildShareText()
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Fallback para entornos sin permiso de clipboard
    prompt('Copiá el texto para compartir:', text)
    return
  }
  copied.value = true
  setTimeout(() => { copied.value = false }, 2500)
}

function buildShareText() {
  const monthLabel = formatMonthYear(store.currentYear, store.currentMonth)
  const lines = [`📊 Liquidación — ${monthLabel}`, '']

  for (const [currency, data] of Object.entries(distribution.value)) {
    if (currencies.value.length > 1) lines.push(`[${currency}]`)

    if (data.totalFixedCosts > 0) {
      lines.push(`Distribuible: ${formatAmount(data.distributableIncome, currency)}`)
      lines.push(`Costos fijos: −${formatAmount(data.totalFixedCosts, currency)}`)
    }
    lines.push(`Neto a repartir: ${formatAmount(data.netDistributable, currency)}`)
    lines.push('')

    const company = data.participants.find((p) => p.type === 'company')
    if (company) {
      lines.push(`🏢 ${company.name} (${company.percentage}%)`)
      lines.push(`   ${formatAmount(company.amount, currency)}`)
      lines.push('')
    }

    const socios = data.participants.filter((p) => p.type === 'partner')
    if (socios.length) {
      lines.push('👥 Socios:')
      for (const s of socios) {
        lines.push(`  • ${s.name} (${s.percentage}%): ${formatAmount(s.amount, currency)}`)
      }
    }
    lines.push('')
  }

  return lines.join('\n').trim()
}

// ── Navegación de período ─────────────────────────────────────────────────────

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
        <div v-for="i in 4" :key="i" class="h-24 rounded-xl bg-neutral-100 animate-pulse" />
      </div>

      <!-- Error de configuración (porcentajes inválidos) -->
      <div
        v-else-if="distributionError"
        role="alert"
        class="flex items-start gap-2 text-sm text-status-error bg-red-50 rounded-xl px-3 py-3"
      >
        <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div>
          <p class="font-semibold">Error en la configuración</p>
          <p class="mt-0.5">{{ distributionError }}</p>
        </div>
      </div>

      <!-- Sin datos distribuibles -->
      <div
        v-else-if="!store.loading && !hasData"
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

      <!-- Contenido principal -->
      <template v-else>

        <!-- Iterar por moneda -->
        <template v-for="currency in currencies" :key="currency">

          <!-- Badge de moneda (solo si hay más de una) -->
          <div v-if="currencies.length > 1" class="flex items-center gap-2 px-1">
            <span
              class="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              :class="currency === 'USD' ? 'bg-emerald-50 text-emerald-700' : 'bg-primary/10 text-primary'"
            >
              {{ currency }}
            </span>
            <div class="flex-1 h-px bg-neutral-100" />
          </div>

          <!-- Base distribuible -->
          <div class="bg-white rounded-xl border border-neutral-200 shadow-sm px-4 py-3 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-xs text-neutral-400">Ingresos distribuibles</span>
              <span class="text-sm font-semibold text-neutral-900 tabular-nums">
                {{ formatAmount(distribution[currency].distributableIncome, currency) }}
              </span>
            </div>
            <div v-if="distribution[currency].totalFixedCosts > 0" class="flex items-center justify-between">
              <span class="text-xs text-neutral-400">− Costos fijos</span>
              <span class="text-sm font-semibold text-status-error tabular-nums">
                − {{ formatAmount(distribution[currency].totalFixedCosts, currency) }}
              </span>
            </div>
            <div class="flex items-center justify-between pt-1.5 border-t border-neutral-100">
              <span class="text-sm font-bold text-neutral-700">Neto a repartir</span>
              <span class="text-lg font-extrabold text-neutral-900 tabular-nums">
                {{ formatAmount(distribution[currency].netDistributable, currency) }}
              </span>
            </div>
          </div>

          <!-- ── Capital empresa ─────────────────────────────── -->
          <div v-if="distribution[currency].participants.some(p => p.type === 'company')">
            <div class="flex items-center gap-2 mb-2 px-1">
              <div class="w-4 h-4 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <svg class="w-2.5 h-2.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                </svg>
              </div>
              <p class="text-xs font-bold text-primary uppercase tracking-wide">Capital empresa</p>
            </div>

            <div
              v-for="p in distribution[currency].participants.filter(p => p.type === 'company')"
              :key="p.id"
              class="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden"
            >
              <!-- Cabecera del participante -->
              <div class="px-4 py-4 flex items-center justify-between">
                <div>
                  <p class="text-base font-semibold text-neutral-900">{{ p.name }}</p>
                  <p class="text-sm text-neutral-400">{{ p.percentage }}% del neto</p>
                </div>
                <p class="text-xl font-extrabold text-primary tabular-nums">
                  {{ formatAmount(p.amount, currency) }}
                </p>
              </div>

              <!-- Toggle transacciones -->
              <button
                v-if="p.transactions.length > 0"
                type="button"
                class="w-full flex items-center justify-between px-4 py-2.5 border-t border-neutral-100 text-xs font-medium text-neutral-500 hover:bg-neutral-50 transition"
                @click="toggleExpand(currency, p.id)"
              >
                <span>{{ p.transactions.length }} {{ p.transactions.length === 1 ? 'transacción' : 'transacciones' }}</span>
                <svg
                  class="w-4 h-4 transition-transform"
                  :class="isExpanded(currency, p.id) ? 'rotate-180' : ''"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              <!-- Lista de transacciones (colapsable) -->
              <div v-show="isExpanded(currency, p.id)" class="divide-y divide-neutral-100 border-t border-neutral-100">
                <div
                  v-for="tx in p.transactions"
                  :key="tx.id"
                  class="px-4 py-3"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-xs font-medium text-neutral-700 truncate">
                        {{ tx.notes || tx.description || 'Sin descripción' }}
                      </p>
                      <p class="text-[10px] text-neutral-400 mt-0.5">{{ formatDateShort(tx.date) }}</p>
                    </div>
                    <div class="text-right shrink-0">
                      <p class="text-xs font-semibold text-neutral-700 tabular-nums">
                        {{ formatAmount(tx.credit, currency) }}
                      </p>
                      <p class="text-[10px] text-primary tabular-nums mt-0.5">
                        +{{ formatAmount(tx.contribution, currency) }}
                      </p>
                    </div>
                  </div>
                  <div v-if="tx.fixedCosts > 0" class="mt-1 text-[10px] text-neutral-400">
                    Costos fijos: −{{ formatAmount(tx.fixedCosts, currency) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Distribución socios ─────────────────────────── -->
          <div v-if="distribution[currency].participants.some(p => p.type === 'partner')">
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

            <div class="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div
                v-for="(p, idx) in distribution[currency].participants.filter(p => p.type === 'partner')"
                :key="p.id"
                :class="idx > 0 ? 'border-t border-neutral-100' : ''"
              >
                <!-- Fila del socio -->
                <div class="px-4 py-4 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-secondary-purple/10 flex items-center justify-center shrink-0">
                      <span class="text-xs font-bold text-secondary-purple">
                        {{ (p.name || '?')[0].toUpperCase() }}
                      </span>
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-neutral-900">{{ p.name }}</p>
                      <p class="text-xs text-neutral-400">{{ p.percentage }}% del neto</p>
                    </div>
                  </div>
                  <p class="text-base font-bold text-neutral-900 tabular-nums">
                    {{ formatAmount(p.amount, currency) }}
                  </p>
                </div>

                <!-- Toggle transacciones -->
                <button
                  v-if="p.transactions.length > 0"
                  type="button"
                  class="w-full flex items-center justify-between px-4 py-2.5 border-t border-neutral-100 text-xs font-medium text-neutral-500 hover:bg-neutral-50 transition"
                  @click="toggleExpand(currency, p.id)"
                >
                  <span>{{ p.transactions.length }} {{ p.transactions.length === 1 ? 'transacción' : 'transacciones' }}</span>
                  <svg
                    class="w-4 h-4 transition-transform"
                    :class="isExpanded(currency, p.id) ? 'rotate-180' : ''"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                <!-- Lista de transacciones colapsable -->
                <div v-show="isExpanded(currency, p.id)" class="divide-y divide-neutral-100 border-t border-neutral-100 bg-neutral-50">
                  <div
                    v-for="tx in p.transactions"
                    :key="tx.id"
                    class="px-4 py-3"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-xs font-medium text-neutral-700 truncate">
                          {{ tx.notes || tx.description || 'Sin descripción' }}
                        </p>
                        <p class="text-[10px] text-neutral-400 mt-0.5">{{ formatDateShort(tx.date) }}</p>
                      </div>
                      <div class="text-right shrink-0">
                        <p class="text-xs font-semibold text-neutral-700 tabular-nums">
                          {{ formatAmount(tx.credit, currency) }}
                        </p>
                        <p class="text-[10px] text-secondary-purple tabular-nums mt-0.5">
                          +{{ formatAmount(tx.contribution, currency) }}
                        </p>
                      </div>
                    </div>
                    <div v-if="tx.fixedCosts > 0" class="mt-1 text-[10px] text-neutral-400">
                      Costos fijos: −{{ formatAmount(tx.fixedCosts, currency) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </template>

        <!-- ── Resumen total ──────────────────────────────────── -->
        <div class="bg-white rounded-xl border border-neutral-200 shadow-sm px-4 py-3 space-y-2">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Resumen del mes</p>
          <div
            v-for="[cur, income] in Object.entries(incomeByCurrency)"
            :key="cur"
            class="space-y-1"
          >
            <div v-if="Object.keys(incomeByCurrency).length > 1" class="text-[10px] font-semibold text-neutral-400 uppercase">
              {{ cur }}
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-neutral-500">Total ingresos</span>
              <span class="font-semibold text-neutral-900 tabular-nums">{{ formatAmount(income, cur) }}</span>
            </div>
            <div v-if="distribution[cur]" class="flex items-center justify-between text-sm">
              <span class="text-neutral-500">Total distribuido</span>
              <span class="font-semibold text-primary tabular-nums">
                {{ formatAmount(distribution[cur].netDistributable, cur) }}
              </span>
            </div>
            <div v-if="distribution[cur] && income > 0" class="flex items-center justify-between text-xs">
              <span class="text-neutral-400">Porcentaje distribuido</span>
              <span class="font-medium text-neutral-600 tabular-nums">
                {{ ((distribution[cur].netDistributable / income) * 100).toFixed(1) }}%
              </span>
            </div>
          </div>
        </div>

        <!-- ── Botón compartir ────────────────────────────────── -->
        <button
          type="button"
          class="w-full py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 font-semibold text-sm min-h-[48px] transition-colors"
          :class="copied
            ? 'border-status-success bg-green-50 text-status-success'
            : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'"
          @click="copyShareText"
        >
          <svg v-if="copied" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <svg v-else class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          {{ copied ? '¡Copiado!' : 'Copiar para compartir' }}
        </button>

      </template>
    </div>
  </div>
</template>
