<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Timestamp } from 'firebase/firestore'
import { useTransactionStore } from '@/stores/useTransactionStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { dateToInputString, dateStringToDate } from '@/shared/utils/formatters'

const route = useRoute()
const router = useRouter()
const store = useTransactionStore()
const workspaceStore = useWorkspaceStore()
const auth = useAuthStore()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const loadingTx = ref(false)
const errorMsg = ref('')
const originalTx = ref(null) // transacción original (para modo editar)

// Campos del formulario
const form = reactive({
  date: new Date().toISOString().split('T')[0],
  description: '',
  notes: '',
  type: 'income',
  amount: '',
  currency: workspaceStore.workspace?.baseCurrency ?? 'CRC',
  code: '',
  reference: '',
  balance: '',
  isDistributable: false,
  fixedCosts: '',
})

// ¿La transacción fue importada? → campos del banco son de solo lectura
const isImported = computed(() => !!originalTx.value?.importedFrom)

// Solo los campos editables en transacciones importadas
const editableFields = computed(() =>
  isImported.value
    ? ['description', 'notes', 'isDistributable', 'fixedCosts']
    : null // null = todo editable
)

function isReadOnly(field) {
  if (!isEdit.value) return false
  if (!isImported.value) return false
  return !editableFields.value.includes(field)
}

// ── Cargar transacción en modo editar ────────────────────────────────────────
async function loadTransaction() {
  loadingTx.value = true
  try {
    const tx = await store.fetchOne(workspaceStore.workspaceId, route.params.id)
    if (!tx) {
      router.replace('/movimientos')
      return
    }
    originalTx.value = tx

    // Poblar el formulario
    form.date = dateToInputString(tx.date)
    form.description = tx.description ?? ''
    form.notes = tx.notes ?? ''
    form.type = tx.type
    form.amount = tx.type === 'income' ? tx.credit : tx.debit
    form.currency = tx.currency
    form.code = tx.code ?? ''
    form.reference = tx.reference ?? ''
    form.balance = tx.balance ?? ''
    form.isDistributable = tx.isDistributable ?? false
    form.fixedCosts = tx.fixedCosts || ''
  } catch (err) {
    errorMsg.value = 'No se pudo cargar la transacción.'
  } finally {
    loadingTx.value = false
  }
}

onMounted(() => {
  if (isEdit.value) loadTransaction()
})

// ── Guardar ──────────────────────────────────────────────────────────────────
function validate() {
  if (!form.date) return 'La fecha es obligatoria.'
  if (!form.description.trim()) return 'La descripción es obligatoria.'
  const amt = Number(form.amount)
  if (!isEdit.value || !isImported.value) {
    if (!amt || amt <= 0) return 'El monto debe ser mayor a cero.'
  }
  if (form.isDistributable && form.fixedCosts !== '' && Number(form.fixedCosts) < 0) {
    return 'Los costos fijos no pueden ser negativos.'
  }
  return null
}

async function handleSave() {
  const validationError = validate()
  if (validationError) {
    errorMsg.value = validationError
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    if (isEdit.value) {
      let data

      if (isImported.value) {
        // Solo campos editables para transacciones importadas
        data = {
          description: form.description.trim(),
          notes: form.notes.trim(),
          isDistributable: form.type === 'income' ? form.isDistributable : false,
          fixedCosts: form.type === 'income' && form.isDistributable
            ? Number(form.fixedCosts) || 0
            : 0,
        }
      } else {
        // Todos los campos para transacciones manuales
        const isIncome = form.type === 'income'
        const amount = Number(form.amount)
        data = {
          date: Timestamp.fromDate(dateStringToDate(form.date)),
          description: form.description.trim(),
          notes: form.notes.trim(),
          type: form.type,
          debit: isIncome ? 0 : amount,
          credit: isIncome ? amount : 0,
          balance: Number(form.balance) || 0,
          currency: form.currency,
          code: form.code.trim(),
          reference: form.reference.trim(),
          isDistributable: isIncome ? form.isDistributable : false,
          fixedCosts: isIncome && form.isDistributable ? Number(form.fixedCosts) || 0 : 0,
        }
      }

      await store.editTransaction(workspaceStore.workspaceId, route.params.id, data)
    } else {
      await store.addTransaction(workspaceStore.workspaceId, form, auth.user.uid)
    }

    router.push('/movimientos')
  } catch (err) {
    errorMsg.value = 'No se pudo guardar. Intentá de nuevo.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function handleDelete() {
  if (!confirm('¿Eliminár esta transacción?')) return
  loading.value = true
  try {
    await store.removeTransaction(workspaceStore.workspaceId, route.params.id)
    router.push('/movimientos')
  } catch {
    errorMsg.value = 'No se pudo eliminar.'
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col min-h-full">

    <!-- Header -->
    <header class="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
      <button
        type="button"
        class="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
        @click="router.push('/movimientos')"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <h1 class="flex-1 text-lg font-bold text-gray-900 dark:text-white">
        {{ isEdit ? 'Editar transacción' : 'Nueva transacción' }}
      </h1>
    </header>

    <!-- Loading inicial (modo editar) -->
    <div v-if="loadingTx" class="flex-1 flex items-center justify-center py-10">
      <svg class="w-6 h-6 text-primary-600 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>

    <!-- Formulario -->
    <form
      v-else
      class="flex-1 px-4 py-5 space-y-4"
      novalidate
      @submit.prevent="handleSave"
    >

      <!-- Error -->
      <div
        v-if="errorMsg"
        role="alert"
        class="flex items-start gap-2 text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-500/10 rounded-xl px-3 py-2.5"
      >
        <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {{ errorMsg }}
      </div>

      <!-- Tipo: Ingreso / Gasto (solo si no es importado) -->
      <div v-if="!isReadOnly('type')">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tipo</label>
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition min-h-[48px]"
            :class="form.type === 'income'
              ? 'border-success-500 bg-success-50 text-success-700 dark:bg-success-500/10 dark:border-success-400 dark:text-success-400'
              : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'"
            @click="form.type = 'income'"
          >
            Ingreso
          </button>
          <button
            type="button"
            class="flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition min-h-[48px]"
            :class="form.type === 'expense'
              ? 'border-danger-500 bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:border-danger-400 dark:text-danger-400'
              : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'"
            @click="form.type = 'expense'"
          >
            Gasto
          </button>
        </div>
      </div>

      <!-- Fecha -->
      <div>
        <label for="tx-date" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Fecha
        </label>
        <input
          id="tx-date"
          v-model="form.date"
          type="date"
          required
          :disabled="isReadOnly('date') || loading"
          class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-800"
        />
      </div>

      <!-- Monto -->
      <div v-if="!isReadOnly('amount')">
        <label for="tx-amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Monto
        </label>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <input
              id="tx-amount"
              v-model="form.amount"
              type="number"
              min="0"
              step="any"
              required
              placeholder="0"
              :disabled="loading"
              class="w-full pl-4 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition disabled:opacity-50"
            />
          </div>
          <!-- Moneda -->
          <div class="flex rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
            <button
              type="button"
              class="px-3 py-3 text-sm font-bold transition min-h-[48px]"
              :class="form.currency === 'CRC' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'"
              @click="form.currency = 'CRC'"
            >₡</button>
            <button
              type="button"
              class="px-3 py-3 text-sm font-bold transition min-h-[48px]"
              :class="form.currency === 'USD' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'"
              @click="form.currency = 'USD'"
            >$</button>
          </div>
        </div>
      </div>

      <!-- Descripción -->
      <div>
        <label for="tx-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Descripción
        </label>
        <input
          id="tx-description"
          v-model="form.description"
          type="text"
          required
          maxlength="200"
          placeholder="¿En qué fue este movimiento?"
          :disabled="loading"
          class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition disabled:opacity-50"
        />
      </div>

      <!-- Notas -->
      <div>
        <label for="tx-notes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Notas <span class="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          id="tx-notes"
          v-model="form.notes"
          rows="3"
          maxlength="500"
          placeholder="Contexto adicional del movimiento..."
          :disabled="loading"
          class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition disabled:opacity-50"
        />
      </div>

      <!-- Distribuible (solo para ingresos) -->
      <div v-if="form.type === 'income'">
        <div class="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3.5">
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">Distribuible entre socios</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">¿Este ingreso se reparte según porcentajes?</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="form.isDistributable"
            class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition cursor-pointer"
            :class="form.isDistributable ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'"
            :disabled="loading"
            @click="form.isDistributable = !form.isDistributable"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition"
              :class="form.isDistributable ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>

        <!-- Costos fijos (solo si es distribuible) -->
        <div v-if="form.isDistributable" class="mt-3">
          <label for="tx-fixed-costs" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Costos fijos a descontar <span class="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            id="tx-fixed-costs"
            v-model="form.fixedCosts"
            type="number"
            min="0"
            step="any"
            placeholder="0"
            :disabled="loading"
            class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition disabled:opacity-50"
          />
        </div>
      </div>

      <!-- Campos opcionales (solo transacciones manuales) -->
      <template v-if="!isImported">
        <details class="group">
          <summary class="cursor-pointer text-sm text-primary-600 dark:text-primary-400 font-medium list-none flex items-center gap-1 py-1">
            <svg class="w-4 h-4 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            Campos adicionales
          </summary>

          <div class="space-y-3 mt-3">
            <!-- Código -->
            <div>
              <label for="tx-code" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Código</label>
              <input
                id="tx-code"
                v-model="form.code"
                type="text"
                maxlength="20"
                placeholder="TF, CP, MD..."
                :disabled="loading"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition disabled:opacity-50"
              />
            </div>

            <!-- Referencia -->
            <div>
              <label for="tx-reference" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Referencia</label>
              <input
                id="tx-reference"
                v-model="form.reference"
                type="text"
                maxlength="50"
                placeholder="Número de referencia bancaria"
                :disabled="loading"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition disabled:opacity-50"
              />
            </div>

            <!-- Saldo -->
            <div>
              <label for="tx-balance" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Saldo posterior</label>
              <input
                id="tx-balance"
                v-model="form.balance"
                type="number"
                step="any"
                placeholder="Saldo de la cuenta después del movimiento"
                :disabled="loading"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition disabled:opacity-50"
              />
            </div>
          </div>
        </details>
      </template>

      <!-- Botones de acción -->
      <div class="pt-2 space-y-2">
        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-base min-h-[48px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Guardando...
          </span>
          <span v-else>{{ isEdit ? 'Guardar cambios' : 'Crear transacción' }}</span>
        </button>

        <!-- Eliminar (solo en modo editar de transacciones manuales) -->
        <button
          v-if="isEdit && !isImported"
          type="button"
          :disabled="loading"
          class="w-full py-3 px-4 rounded-xl bg-danger-50 dark:bg-danger-500/10 text-danger-600 dark:text-danger-400 font-semibold text-sm min-h-[48px] transition hover:bg-danger-100 dark:hover:bg-danger-500/20 disabled:opacity-50"
          @click="handleDelete"
        >
          Eliminar transacción
        </button>
      </div>

    </form>
  </div>
</template>
