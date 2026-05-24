<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTransactionStore } from '@/stores/useTransactionStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import TransactionCard from '@/shared/components/TransactionCard.vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import CurrencyBadge from '@/shared/components/CurrencyBadge.vue'
import { formatMonthYear, formatDateLong, formatAmount, prevMonth, nextMonth } from '@/shared/utils/formatters'

const store = useTransactionStore()
const workspaceStore = useWorkspaceStore()
const router = useRouter()

// ── Detalle seleccionado ──────────────────────────────────────────────────────
const selectedTx = ref(null)
const sheetOpen = ref(false)

function openDetail(tx) {
  selectedTx.value = tx
  sheetOpen.value = true
}

function closeDetail() {
  sheetOpen.value = false
  setTimeout(() => { selectedTx.value = null }, 300) // esperar animación
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

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  store.subscribe(workspaceStore.workspaceId, store.currentYear, store.currentMonth)
})

onUnmounted(() => {
  store.unsubscribe()
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function editTransaction(tx) {
  closeDetail()
  router.push(`/movimientos/${tx.id}/editar`)
}
</script>

<template>
  <div class="flex flex-col min-h-full">

    <!-- Header fijo -->
    <header class="sticky top-0 z-10 bg-white border-b border-neutral-100 px-4 pt-4 pb-3">
      <div class="flex items-center justify-between mb-3">
        <h1 class="text-xl font-bold text-neutral-900">Movimientos</h1>
      </div>

      <!-- Filtro de moneda -->
      <div class="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-3">
        <button
          v-for="opt in [{ v: 'all', l: 'Todos' }, { v: 'CRC', l: '₡ CRC' }, { v: 'USD', l: '$ USD' }]"
          :key="opt.v"
          type="button"
          class="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
          :class="store.currencyFilter === opt.v
            ? 'bg-white text-neutral-900 shadow-sm'
            : 'text-neutral-500 hover:text-neutral-700'"
          @click="store.setCurrencyFilter(opt.v)"
        >
          {{ opt.l }}
        </button>
      </div>

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

    <!-- Contenido -->
    <div class="flex-1 px-4 py-4 space-y-4">

      <!-- Loading -->
      <div v-if="store.loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="bg-neutral-100 rounded-2xl h-16 animate-pulse" />
      </div>

      <!-- Error -->
      <div
        v-else-if="store.error"
        class="flex flex-col items-center gap-2 py-10 text-center"
      >
        <p class="text-sm text-status-error">{{ store.error }}</p>
        <button
          class="text-sm text-primary font-medium"
          @click="store.subscribe(workspaceStore.workspaceId, store.currentYear, store.currentMonth)"
        >
          Reintentar
        </button>
      </div>

      <!-- Lista agrupada por fecha -->
      <template v-else-if="store.filteredGroupedByDate.length > 0">
        <div v-for="[dateLabel, txs] in store.filteredGroupedByDate" :key="dateLabel" class="space-y-2">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide px-1">
            {{ dateLabel }}
          </p>
          <div class="grid gap-2 md:grid-cols-2">
            <TransactionCard
              v-for="tx in txs"
              :key="tx.id"
              :transaction="tx"
              @tap="openDetail"
            />
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <div v-else class="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div class="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-neutral-700">Sin movimientos</p>
          <p class="text-sm text-neutral-400 mt-1">
            No hay transacciones en {{ formatMonthYear(store.currentYear, store.currentMonth) }}.
          </p>
        </div>
        <RouterLink
          to="/movimientos/nueva"
          class="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold min-h-[44px] flex items-center"
        >
          Agregar primera transacción
        </RouterLink>
      </div>
    </div>

    <!-- FAB: nueva transacción -->
    <RouterLink
      to="/movimientos/nueva"
      class="fixed bottom-20 right-4 z-20 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary-c active:scale-95 transition-transform"
      aria-label="Nueva transacción"
    >
      <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </RouterLink>

    <!-- Bottom sheet: detalle de transacción -->
    <BottomSheet
      :open="sheetOpen"
      :title="selectedTx ? (selectedTx.notes?.trim() || selectedTx.description) : ''"
      @close="closeDetail"
    >
      <template v-if="selectedTx">
        <div class="px-5 py-4 space-y-4">

          <!-- Monto destacado -->
          <div
            class="rounded-2xl px-4 py-4 text-center"
            :class="selectedTx.type === 'income'
              ? 'bg-status-success/10'
              : 'bg-status-error/10'"
          >
            <p class="text-3xl font-extrabold tabular-nums"
               :class="selectedTx.type === 'income'
                 ? 'text-status-success'
                 : 'text-status-error'">
              {{ selectedTx.type === 'income' ? '+' : '−' }}{{ formatAmount(
                selectedTx.type === 'income' ? selectedTx.credit : selectedTx.debit,
                selectedTx.currency
              ) }}
            </p>
            <div class="flex items-center justify-center gap-2 mt-1">
              <span class="text-sm text-neutral-500">
                {{ formatDateLong(selectedTx.date) }}
              </span>
              <CurrencyBadge :currency="selectedTx.currency" />
            </div>
          </div>

          <!-- Campos del detalle -->
          <dl class="space-y-3">
            <div v-if="selectedTx.description" class="flex flex-col gap-0.5">
              <dt class="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">Descripción</dt>
              <dd class="text-sm text-neutral-800">{{ selectedTx.description }}</dd>
            </div>
            <div v-if="selectedTx.notes" class="flex flex-col gap-0.5">
              <dt class="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">Notas</dt>
              <dd class="text-sm text-neutral-800">{{ selectedTx.notes }}</dd>
            </div>
            <div v-if="selectedTx.reference" class="flex flex-col gap-0.5">
              <dt class="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">Referencia</dt>
              <dd class="text-sm text-neutral-500 font-mono">{{ selectedTx.reference }}</dd>
            </div>
            <div v-if="selectedTx.code" class="flex flex-col gap-0.5">
              <dt class="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">Código</dt>
              <dd class="text-sm text-neutral-800">{{ selectedTx.code }}</dd>
            </div>
            <div v-if="selectedTx.type === 'income'" class="flex flex-col gap-0.5">
              <dt class="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">Distribuible</dt>
              <dd class="text-sm">
                <span v-if="selectedTx.isDistributable" class="text-primary font-medium">
                  Sí {{ selectedTx.fixedCosts ? `· Costos fijos: ${formatAmount(selectedTx.fixedCosts, selectedTx.currency)}` : '' }}
                </span>
                <span v-else class="text-neutral-400">No</span>
              </dd>
            </div>
            <div v-if="selectedTx.importedFrom" class="flex flex-col gap-0.5">
              <dt class="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">Importado de</dt>
              <dd class="text-sm text-neutral-500 truncate">{{ selectedTx.importedFrom }}</dd>
            </div>
          </dl>

          <!-- Acciones -->
          <div class="pt-2 pb-2 space-y-2">
            <button
              type="button"
              class="w-full py-3 px-4 rounded-xl border border-neutral-200 text-neutral-700 font-semibold text-sm min-h-[48px] transition hover:bg-neutral-50"
              @click="editTransaction(selectedTx)"
            >
              Editar
            </button>
          </div>

        </div>
      </template>
    </BottomSheet>

  </div>
</template>
