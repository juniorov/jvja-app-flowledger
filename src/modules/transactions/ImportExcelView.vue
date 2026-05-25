<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { useImportExcel } from '@/composables/useImportExcel'
import { saveBatchTransactions } from '@/services/transaction.service'
import { subscribeToTransactions } from '@/services/transaction.service'
import { formatAmount } from '@/shared/utils/formatters'

const auth = useAuthStore()
const workspaceStore = useWorkspaceStore()
const router = useRouter()

const { rows, loading, error, fileName, detectedCurrency, parseFile, markDuplicates, setCurrency, reset } = useImportExcel()

const fileInput = ref(null)
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)
const step = ref('pick') // 'pick' | 'preview' | 'done'

// Para formatear montos en las cards usamos la moneda detectada (o CRC como fallback visual)
const previewCurrency = computed(() => detectedCurrency.value ?? 'CRC')

// ── Selección de archivo ──────────────────────────────────────────────────────

function triggerFilePicker() {
  fileInput.value?.click()
}

async function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  await loadFile(file)
  // Limpiar el input para permitir volver a seleccionar el mismo archivo
  event.target.value = ''
}

async function handleDrop(event) {
  const file = event.dataTransfer.files?.[0]
  if (!file) return
  await loadFile(file)
}

async function loadFile(file) {
  await parseFile(file)
  if (rows.value.length > 0) {
    await fetchAndMarkDuplicates()
    step.value = 'preview'
  }
}

// ── Detección de duplicados ───────────────────────────────────────────────────

/**
 * Devuelve todos los pares {year, month} cubiertos entre dos fechas (inclusive).
 */
function monthsBetween(minDate, maxDate) {
  const months = []
  let y = minDate.getFullYear()
  let m = minDate.getMonth() + 1
  const endY = maxDate.getFullYear()
  const endM = maxDate.getMonth() + 1
  while (y < endY || (y === endY && m <= endM)) {
    months.push({ year: y, month: m })
    if (m === 12) { y++; m = 1 } else { m++ }
  }
  return months
}

async function fetchAndMarkDuplicates() {
  const dates = rows.value.map((r) => r.date.getTime())
  const minDate = new Date(Math.min(...dates))
  const maxDate = new Date(Math.max(...dates))

  // Consultar TODOS los meses del rango para no dejar huecos
  const months = monthsBetween(minDate, maxDate)
  await Promise.all(
    months.map(({ year, month }) =>
      new Promise((resolve) => {
        const unsub = subscribeToTransactions(
          workspaceStore.workspaceId,
          year,
          month,
          (txs) => { markDuplicates(txs); unsub(); resolve() },
          () => { unsub(); resolve() }
        )
      })
    )
  )
}

// ── Guardar ───────────────────────────────────────────────────────────────────

const rowsToImport = computed(() => rows.value.filter((r) => r.includeInImport))
const duplicateCount = computed(() => rows.value.filter((r) => r.isDuplicate).length)

async function handleSave() {
  if (rowsToImport.value.length === 0) return
  saving.value = true
  saveError.value = ''

  try {
    await saveBatchTransactions(workspaceStore.workspaceId, rowsToImport.value, auth.user.uid)
    step.value = 'done'
  } catch (err) {
    saveError.value = 'No se pudo guardar. Verificá tu conexión e intentá de nuevo.'
    console.error('[ImportExcelView] save error:', err)
  } finally {
    saving.value = false
  }
}

function handleReset() {
  reset()
  step.value = 'pick'
  saveError.value = ''
}

function goToTransactions() {
  router.push('/movimientos')
}

// ── Helpers de UI ─────────────────────────────────────────────────────────────

function rowAmount(row) {
  return row.type === 'income' ? row.credit : row.debit
}
</script>

<template>
  <div class="flex flex-col min-h-full">

    <!-- Header -->
    <header class="sticky top-0 z-10 bg-white border-b border-neutral-100 px-4 pt-4 pb-3">
      <div class="flex items-center gap-3">
        <button
          v-if="step === 'preview'"
          type="button"
          class="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
          @click="handleReset"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 class="text-xl font-bold text-neutral-900">Importar extracto</h1>
      </div>
      <p v-if="step === 'preview'" class="text-xs text-neutral-400 mt-0.5">
        {{ fileName }}
      </p>
    </header>

    <!-- ── PASO 1: Seleccionar archivo ────────────────────────────────── -->
    <div v-if="step === 'pick'" class="flex-1 px-4 py-6 flex flex-col gap-5">

      <!-- Zona de carga -->
      <div
        class="relative flex flex-col items-center justify-center gap-4 border-2 border-dashed border-neutral-200 rounded-2xl px-6 py-12 bg-neutral-50 cursor-pointer active:bg-neutral-100 transition"
        @click="triggerFilePicker"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <svg class="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div class="text-center">
          <p class="text-base font-semibold text-neutral-800">Seleccioná el extracto BCR</p>
          <p class="text-sm text-neutral-400 mt-1">Archivo .xls o .xlsx</p>
        </div>

        <!-- Loading overlay -->
        <div
          v-if="loading"
          class="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80"
        >
          <svg class="w-8 h-8 text-primary animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept=".xls,.xlsx"
        class="hidden"
        @change="handleFileChange"
      />

      <!-- Error de parseo -->
      <div
        v-if="error"
        role="alert"
        class="flex items-start gap-2 text-sm text-status-error bg-red-50 rounded-xl px-3 py-2.5"
      >
        <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {{ error }}
      </div>

      <!-- Instrucciones -->
      <div class="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 space-y-3">
        <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">¿Cómo exportar el extracto del BCR?</p>
        <ol class="space-y-2">
          <li v-for="(step, i) in [
            'Ingresá a SINPE / Banca en línea BCR',
            'Seleccioná la cuenta → Movimientos',
            'Filtrá el período que querés importar',
            'Exportá en formato Excel (.xls o .xlsx)',
          ]" :key="i" class="flex items-start gap-2.5 text-sm text-neutral-600">
            <span class="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              {{ i + 1 }}
            </span>
            {{ step }}
          </li>
        </ol>
      </div>
    </div>

    <!-- ── PASO 2: Preview de transacciones ───────────────────────────── -->
    <div v-else-if="step === 'preview'" class="flex-1 flex flex-col">

      <!-- Resumen -->
      <div class="px-4 pt-3 pb-3 bg-neutral-50 border-b border-neutral-100">
        <div class="flex items-center justify-between text-sm">
          <span class="text-neutral-500">
            <span class="font-semibold text-neutral-900">{{ rows.length }}</span> transacciones detectadas
          </span>
          <span v-if="duplicateCount > 0" class="text-status-warning font-medium">
            {{ duplicateCount }} {{ duplicateCount === 1 ? 'duplicada' : 'duplicadas' }}
          </span>
        </div>
        <div class="flex items-center justify-between text-sm mt-0.5">
          <span class="text-neutral-500">
            <span class="font-semibold text-neutral-900">{{ rowsToImport.length }}</span> seleccionadas para importar
          </span>
        </div>
      </div>

      <!-- Moneda detectada o selector manual -->
      <div class="px-4 pt-3">

        <!-- Moneda detectada automáticamente -->
        <div
          v-if="detectedCurrency !== null"
          class="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5"
        >
          <svg class="w-4 h-4 text-status-success shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span class="text-sm text-neutral-700">
            Moneda detectada:
            <span class="font-bold text-neutral-900">{{ detectedCurrency }}</span>
          </span>
          <!-- Permite corregir si la detección fue incorrecta -->
          <div class="ml-auto flex gap-1.5">
            <button
              v-for="opt in ['CRC', 'USD']"
              :key="opt"
              type="button"
              class="text-xs font-semibold px-2 py-1 rounded-lg transition"
              :class="detectedCurrency === opt
                ? 'bg-primary text-white'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'"
              @click="setCurrency(opt)"
            >
              {{ opt }}
            </button>
          </div>
        </div>

        <!-- Selector manual — moneda no detectada -->
        <div
          v-else
          class="bg-amber-50 border border-amber-200 rounded-xl px-3 py-3"
        >
          <div class="flex items-start gap-2 mb-2.5">
            <svg class="w-4 h-4 text-status-warning mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p class="text-sm text-neutral-700">
              No se pudo detectar la moneda automáticamente.
              <span class="font-semibold">Seleccioná antes de importar:</span>
            </p>
          </div>
          <div class="flex gap-2">
            <button
              v-for="opt in ['CRC', 'USD']"
              :key="opt"
              type="button"
              class="flex-1 py-2 rounded-lg border-2 text-sm font-bold transition"
              :class="'border-neutral-200 bg-white text-neutral-700 hover:border-primary hover:text-primary'"
              @click="setCurrency(opt)"
            >
              {{ opt === 'CRC' ? '₡ Colones' : '$ Dólares' }}
            </button>
          </div>
        </div>

      </div>

      <!-- Lista de cards -->
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div
          v-for="row in rows"
          :key="row._key"
          class="bg-white rounded-xl border shadow-sm overflow-hidden transition"
          :class="[
            row.isDuplicate ? 'border-status-warning/40' : 'border-neutral-200',
            !row.includeInImport ? 'opacity-60' : '',
          ]"
        >
          <!-- Cabecera de la card -->
          <div class="px-4 pt-3 pb-2 flex items-start gap-3">
            <!-- Checkbox incluir -->
            <button
              type="button"
              class="mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition"
              :class="row.includeInImport
                ? 'bg-primary border-primary'
                : 'bg-white border-neutral-300'"
              @click="row.includeInImport = !row.includeInImport"
            >
              <svg v-if="row.includeInImport" class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-semibold text-neutral-900 truncate">{{ row.description || '—' }}</p>
                <p
                  class="text-sm font-bold shrink-0 tabular-nums"
                  :class="row.type === 'income' ? 'text-status-success' : 'text-status-error'"
                >
                  {{ row.type === 'income' ? '+' : '−' }}{{ formatAmount(rowAmount(row), previewCurrency) }}
                </p>
              </div>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="text-xs text-neutral-400">{{ row.dateStr }}</span>
                <span v-if="row.code" class="text-[10px] font-medium bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded-full">
                  {{ row.code }}
                </span>
                <span v-if="row.reference" class="text-[10px] text-neutral-400 font-mono truncate max-w-[120px]">
                  #{{ row.reference }}
                </span>
                <!-- Badge duplicado -->
                <span
                  v-if="row.isDuplicate"
                  class="text-[10px] font-semibold bg-status-warning/10 text-status-warning px-1.5 py-0.5 rounded-full"
                >
                  Duplicada
                </span>
              </div>
            </div>
          </div>

          <!-- Campos editables (solo si incluida) -->
          <div v-if="row.includeInImport" class="px-4 pb-3 space-y-2.5 border-t border-neutral-100 pt-2.5">
            <!-- Notas -->
            <div>
              <label class="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">
                Notas
              </label>
              <input
                v-model="row.notes"
                type="text"
                placeholder="Descripción adicional..."
                maxlength="200"
                class="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder-neutral-300 text-sm min-h-[40px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
            </div>

            <!-- Distribuible + costos fijos (solo si es ingreso) -->
            <div v-if="row.type === 'income'" class="flex items-center gap-3">
              <!-- Toggle distribuible -->
              <button
                type="button"
                class="flex items-center gap-2 min-h-[36px] flex-1"
                @click="row.isDistributable = !row.isDistributable"
              >
                <div
                  class="w-9 h-5 rounded-full transition-colors shrink-0"
                  :class="row.isDistributable ? 'bg-primary' : 'bg-neutral-200'"
                >
                  <div
                    class="w-4 h-4 rounded-full bg-white shadow-sm mt-0.5 transition-transform"
                    :class="row.isDistributable ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'"
                  />
                </div>
                <span class="text-xs font-medium text-neutral-700">Distribuible</span>
              </button>

              <!-- Costos fijos (solo si es distribuible) -->
              <div v-if="row.isDistributable" class="flex items-center gap-1.5">
                <span class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide shrink-0">Costos</span>
                <input
                  v-model.number="row.fixedCosts"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  class="w-24 px-2 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 text-xs text-right min-h-[36px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition tabular-nums"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer con botón guardar -->
      <div class="px-4 pt-3 pb-5 bg-white border-t border-neutral-100 space-y-2">
        <!-- Error de guardado -->
        <div
          v-if="saveError"
          role="alert"
          class="flex items-start gap-2 text-sm text-status-error bg-red-50 rounded-xl px-3 py-2.5"
        >
          <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ saveError }}
        </div>

        <button
          type="button"
          :disabled="saving || rowsToImport.length === 0 || detectedCurrency === null"
          class="w-full py-3 px-4 rounded-lg bg-primary hover:bg-primary-c text-white font-semibold text-sm min-h-[48px] transition-colors disabled:bg-neutral-200 disabled:text-neutral-500 disabled:cursor-not-allowed"
          @click="handleSave"
        >
          <span v-if="saving" class="flex items-center justify-center gap-2">
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Guardando...
          </span>
          <span v-else>
            Importar {{ rowsToImport.length }}
            {{ rowsToImport.length === 1 ? 'transacción' : 'transacciones' }}
          </span>
        </button>
      </div>
    </div>

    <!-- ── PASO 3: Confirmación ────────────────────────────────────────── -->
    <div v-else-if="step === 'done'" class="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-5 text-center">
      <div class="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
        <svg class="w-8 h-8 text-status-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div>
        <p class="text-lg font-bold text-neutral-900">¡Importación exitosa!</p>
        <p class="text-sm text-neutral-500 mt-1">
          {{ rowsToImport.length }}
          {{ rowsToImport.length === 1 ? 'transacción importada' : 'transacciones importadas' }}
          correctamente.
        </p>
      </div>
      <div class="flex flex-col gap-2 w-full max-w-xs">
        <button
          type="button"
          class="w-full py-3 px-4 rounded-lg bg-primary hover:bg-primary-c text-white font-semibold text-sm min-h-[48px] transition-colors"
          @click="goToTransactions"
        >
          Ver movimientos
        </button>
        <button
          type="button"
          class="w-full py-3 px-4 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-sm min-h-[48px] transition-colors"
          @click="handleReset"
        >
          Importar otro archivo
        </button>
      </div>
    </div>

  </div>
</template>
