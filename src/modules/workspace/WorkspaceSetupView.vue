<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { createWorkspace } from '@/services/workspace.service'
import PartnersEditor from '@/shared/components/PartnersEditor.vue'

const auth = useAuthStore()
const workspaceStore = useWorkspaceStore()
const router = useRouter()

const step = ref(1)
const loading = ref(false)
const errorMsg = ref('')

const form = reactive({
  name: '',
  baseCurrency: 'CRC',
  // Participante company: fijo, id siempre 'company', no se puede eliminar
  company: {
    id: 'company',
    type: 'company',
    name: 'Empresa',
    percentage: 40,
  },
  // Socios: inicia con 1 por defecto
  partners: [
    {
      id: crypto.randomUUID(),
      type: 'partner',
      name: '',
      lastName: '',
      email: '',
      percentage: 60,
    },
  ],
})

const totalPercentage = computed(() =>
  form.company.percentage + form.partners.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0)
)

const isStep1Valid = computed(() => form.name.trim().length >= 2)

const isStep2Valid = computed(() => {
  if (totalPercentage.value !== 100) return false
  if (!form.company.name.trim()) return false
  return form.partners.every((p) => p.name.trim().length >= 1)
})

function nextStep() {
  if (!isStep1Valid.value) return
  // Pré-llenar nombre del participante empresa con el nombre de la empresa
  if (form.company.name === 'Empresa') {
    form.company.name = form.name
  }
  step.value = 2
}

async function handleCreate() {
  if (!isStep2Valid.value) {
    errorMsg.value = 'Completá los nombres y asegurate que los porcentajes sumen exactamente 100%.'
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    // El array de participantes: company siempre primero
    const participants = [
      {
        id: form.company.id,
        type: form.company.type,
        name: form.company.name.trim(),
        percentage: Number(form.company.percentage),
      },
      ...form.partners.map((p) => ({
        id: p.id,
        type: p.type,
        name: p.name.trim(),
        lastName: p.lastName.trim(),
        email: p.email.trim().toLowerCase(),
        percentage: Number(p.percentage),
      })),
    ]

    await createWorkspace(auth.user.uid, auth.user.email, {
      name: form.name,
      baseCurrency: form.baseCurrency,
      partners: participants,
    })

    await workspaceStore.fetchWorkspace(auth.user.uid)
    router.push('/balance')
  } catch (err) {
    errorMsg.value = 'No se pudo crear el workspace. Intentá de nuevo.'
    console.error(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-svh bg-neutral-50 flex flex-col">
    <div class="flex-1 flex flex-col justify-start px-5 pt-10 pb-10 max-w-md mx-auto w-full">

      <!-- Header -->
      <div class="mb-8">
        <button
          v-if="step === 2"
          type="button"
          class="flex items-center gap-1 text-sm text-neutral-500 mb-4 -ml-1 min-h-[44px]"
          @click="step = 1"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Atrás
        </button>

        <h1 class="text-2xl font-bold text-neutral-900">
          {{ step === 1 ? 'Creá tu empresa' : 'Configurá los participantes' }}
        </h1>
        <p class="mt-1 text-sm text-neutral-500">
          {{ step === 1
            ? 'Información básica de tu workspace.'
            : 'Definí cómo se distribuyen las ganancias entre la empresa y los socios.' }}
        </p>

        <!-- Indicador de pasos -->
        <div class="flex gap-1.5 mt-5">
          <div class="h-1 flex-1 rounded-full" :class="step >= 1 ? 'bg-primary' : 'bg-neutral-200'" />
          <div class="h-1 flex-1 rounded-full" :class="step >= 2 ? 'bg-primary' : 'bg-neutral-200'" />
        </div>
      </div>

      <!-- Error global -->
      <div
        v-if="errorMsg"
        role="alert"
        class="mb-4 flex items-start gap-2 text-sm text-status-error bg-red-50 rounded-xl px-3 py-2.5"
      >
        <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {{ errorMsg }}
      </div>

      <!-- ── PASO 1: Datos de la empresa ───────────────────────── -->
      <div v-if="step === 1" class="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 space-y-4">

        <div>
          <label for="ws-name" class="block text-sm font-medium text-neutral-700 mb-1.5">
            Nombre de la empresa
          </label>
          <input
            id="ws-name"
            v-model="form.name"
            type="text"
            placeholder="Ej: Servicios JV &amp; JA"
            maxlength="80"
            class="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1.5">
            Moneda por defecto
            <span class="font-normal text-neutral-400">(se puede cambiar por transacción)</span>
          </label>
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 py-3 rounded-lg border-2 font-medium text-sm transition min-h-[48px]"
              :class="form.baseCurrency === 'CRC'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-neutral-200 text-neutral-600'"
              @click="form.baseCurrency = 'CRC'"
            >
              ₡ Colones
            </button>
            <button
              type="button"
              class="flex-1 py-3 rounded-lg border-2 font-medium text-sm transition min-h-[48px]"
              :class="form.baseCurrency === 'USD'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-neutral-200 text-neutral-600'"
              @click="form.baseCurrency = 'USD'"
            >
              $ Dólares
            </button>
          </div>
        </div>

        <button
          type="button"
          :disabled="!isStep1Valid"
          class="w-full py-3 px-4 rounded-lg bg-primary hover:bg-primary-c text-white font-semibold text-base min-h-[48px] transition-colors disabled:bg-neutral-200 disabled:text-neutral-500 disabled:cursor-not-allowed"
          @click="nextStep"
        >
          Siguiente
        </button>
      </div>

      <!-- ── PASO 2: Participantes ─────────────────────────────── -->
      <div v-else-if="step === 2" class="space-y-4">

        <!-- Participante empresa (fijo, no eliminable) -->
        <div class="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <!-- Cabecera con badge "no eliminable" -->
          <div class="flex items-center gap-2 px-4 pt-3.5 pb-1">
            <div class="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <svg class="w-3 h-3 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                <line x1="12" y1="12" x2="12" y2="16"/>
                <line x1="10" y1="14" x2="14" y2="14"/>
              </svg>
            </div>
            <span class="text-xs font-semibold text-primary uppercase tracking-wide">Capital empresa</span>
            <span class="ml-auto text-[10px] font-medium text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">Fijo</span>
          </div>

          <div class="px-4 pb-4 space-y-3">
            <!-- Nombre del participante empresa -->
            <div>
              <label class="block text-xs font-medium text-neutral-700 mb-1">Nombre visible en reportes</label>
              <input
                v-model="form.company.name"
                type="text"
                maxlength="60"
                placeholder="Empresa"
                :disabled="loading"
                class="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition disabled:opacity-50"
              />
            </div>
            <!-- Porcentaje -->
            <div>
              <label class="block text-xs font-medium text-neutral-700 mb-1">% de reserva empresarial</label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="form.company.percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="0"
                  :disabled="loading"
                  class="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition disabled:opacity-50 text-right font-semibold tabular-nums"
                />
                <span class="text-sm font-semibold text-neutral-500 shrink-0">%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Socios (editor de partners) -->
        <PartnersEditor
          v-model="form.partners"
          :company-percentage="Number(form.company.percentage) || 0"
          :disabled="loading"
        />

        <!-- Botón crear -->
        <button
          type="button"
          :disabled="loading || !isStep2Valid"
          class="w-full py-3 px-4 rounded-lg bg-primary hover:bg-primary-c text-white font-semibold text-base min-h-[48px] transition-colors disabled:bg-neutral-200 disabled:text-neutral-500 disabled:cursor-not-allowed"
          @click="handleCreate"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Creando workspace...
          </span>
          <span v-else>Crear workspace</span>
        </button>

      </div>
    </div>
  </div>
</template>
