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
    <header class="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-4 pt-4 pb-3">
      <div class="flex items-center justify-between mb-3">
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">Movimientos</h1>
        <RouterLink
          to="/movimientos/nueva"
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold min-h-[36px] transition hover:bg-primary-700 active:bg-primary-700"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva
        </RouterLink>
      </div>

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
    <div class="flex-1 px-4 py-4 space-y-4">

      <!-- Loading -->
      <div v-if="store.loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="bg-gray-100 dark:bg-gray-800 rounded-2xl h-16 animate-pulse" />
      </div>

      <!-- Error -->
      <div
        v-else-if="store.error"
        class="flex flex-col items-center gap-2 py-10 text-center"
      >
        <p class="text-sm text-danger-600 dark:text-danger-400">{{ store.error }}</p>
        <button
          class="text-sm text-primary-600 dark:text-primary-400 font-medium"
          @click="store.subscribe(workspaceStore.workspaceId, store.currentYear, store.currentMonth)"
        >
          Reintentar
        </button>
      </div>

      <!-- Lista agrupada por fecha -->
      <template v-else-if="store.groupedByDate.length > 0">
        <div v-for="[dateLabel, txs] in store.groupedByDate" :key="dateLabel" class="space-y-2">
          <p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1">
            {{ dateLabel }}
          </p>
          <TransactionCard
            v-for="tx in txs"
            :key="tx.id"
            :transaction="tx"
            @tap="openDetail"
          />
        </div>
      </template>

      <!-- Empty state -->
      <div v-else class="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Sin movimientos</p>
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
    </div>

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
              ? 'bg-success-50 dark:bg-success-500/10'
              : 'bg-danger-50 dark:bg-danger-500/10'"
          >
            <p class="text-3xl font-extrabold tabular-nums"
               :class="selectedTx.type === 'income'
                 ? 'text-success-700 dark:text-success-300'
                 : 'text-danger-700 dark:text-danger-300'">
              {{ selectedTx.type === 'income' ? '+' : '−' }}{{ formatAmount(
                selectedTx.type === 'income' ? selectedTx.credit : selectedTx.debit,
                selectedTx.currency
              ) }}
            </p>
            <div class="flex items-center justify-center gap-2 mt-1">
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ formatDateLong(selectedTx.date) }}
              </span>
              <CurrencyBadge :currency="selectedTx.currency" />
            </div>
          </div>

          <!-- Campos del detalle -->
          <dl class="space-y-3">
            <div v-if="selectedTx.description" class="flex flex-col gap-0.5">
              <dt class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Descripción</dt>
              <dd class="text-sm text-gray-800 dark:text-gray-200">{{ selectedTx.description }}</dd>
            </div>
            <div v-if="selectedTx.notes" class="flex flex-col gap-0.5">
              <dt class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Notas</dt>
              <dd class="text-sm text-gray-800 dark:text-gray-200">{{ selectedTx.notes }}</dd>
            </div>
            <div v-if="selectedTx.reference" class="flex flex-col gap-0.5">
              <dt class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Referencia</dt>
              <dd class="text-sm text-gray-500 dark:text-gray-400 font-mono">{{ selectedTx.reference }}</dd>
            </div>
            <div v-if="selectedTx.code" class="flex flex-col gap-0.5">
              <dt class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Código</dt>
              <dd class="text-sm text-gray-800 dark:text-gray-200">{{ selectedTx.code }}</dd>
            </div>
            <div v-if="selectedTx.type === 'income'" class="flex flex-col gap-0.5">
              <dt class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Distribuible</dt>
              <dd class="text-sm">
                <span v-if="selectedTx.isDistributable" class="text-primary-600 dark:text-primary-400 font-medium">
                  Sí {{ selectedTx.fixedCosts ? `· Costos fijos: ${formatAmount(selectedTx.fixedCosts, selectedTx.currency)}` : '' }}
                </span>
                <span v-else class="text-gray-400">No</span>
              </dd>
            </div>
            <div v-if="selectedTx.importedFrom" class="flex flex-col gap-0.5">
              <dt class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Importado de</dt>
              <dd class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ selectedTx.importedFrom }}</dd>
            </div>
          </dl>

          <!-- Acciones -->
          <div class="pt-2 pb-2 space-y-2">
            <button
              type="button"
              class="w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold text-sm min-h-[48px] transition hover:bg-gray-50 dark:hover:bg-gray-700"
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
