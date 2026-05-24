<script setup>
import { computed } from 'vue'

/**
 * Editor de participantes tipo 'partner'.
 * v-model: array de { id, type: 'partner', name, lastName, email, percentage }
 * companyPercentage: porcentaje del participante company (para calcular total combinado)
 */
const props = defineProps({
  modelValue: {
    type: Array,
    required: true,
  },
  companyPercentage: {
    type: Number,
    default: 0,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const partners = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// Total combinado: empresa + socios
const total = computed(() =>
  props.companyPercentage +
  partners.value.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0)
)

const totalValid = computed(() => total.value === 100)

const remaining = computed(() => 100 - total.value)

function addPartner() {
  emit('update:modelValue', [
    ...partners.value,
    {
      id: crypto.randomUUID(),
      type: 'partner',
      name: '',
      lastName: '',
      email: '',
      percentage: 0,
    },
  ])
}

function removePartner(index) {
  if (partners.value.length <= 1) return
  emit('update:modelValue', partners.value.filter((_, i) => i !== index))
}

function updatePartner(index, field, value) {
  emit(
    'update:modelValue',
    partners.value.map((p, i) => (i === index ? { ...p, [field]: value } : p))
  )
}
</script>

<template>
  <div class="space-y-3">

    <!-- Cabecera sección socios -->
    <div class="flex items-center justify-between">
      <p class="text-sm font-semibold text-neutral-700">Socios</p>
      <span class="text-xs text-neutral-400">{{ partners.length }} {{ partners.length === 1 ? 'socio' : 'socios' }}</span>
    </div>

    <!-- Lista de socios -->
    <div
      v-for="(partner, i) in partners"
      :key="partner.id"
      class="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden"
    >
      <!-- Cabecera card -->
      <div class="flex items-center justify-between px-4 pt-3.5 pb-1">
        <span class="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          Socio {{ i + 1 }}
        </span>
        <button
          v-if="partners.length > 1"
          type="button"
          :disabled="disabled"
          class="p-1 rounded-lg text-neutral-400 hover:text-status-error hover:bg-red-50 transition disabled:opacity-50 min-h-[32px] min-w-[32px] flex items-center justify-center"
          :title="`Eliminar socio ${i + 1}`"
          @click="removePartner(i)"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>

      <!-- Campos -->
      <div class="px-4 pb-4 space-y-3">
        <div>
          <label class="block text-xs font-medium text-neutral-700 mb-1">Nombre</label>
          <input
            :value="partner.name"
            type="text"
            maxlength="60"
            placeholder="Juan"
            :disabled="disabled"
            class="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition disabled:opacity-50"
            @input="updatePartner(i, 'name', $event.target.value)"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-neutral-700 mb-1">Apellidos</label>
          <input
            :value="partner.lastName"
            type="text"
            maxlength="80"
            placeholder="Vargas Mora"
            :disabled="disabled"
            class="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition disabled:opacity-50"
            @input="updatePartner(i, 'lastName', $event.target.value)"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-neutral-700 mb-1">Correo electrónico</label>
          <input
            :value="partner.email"
            type="email"
            maxlength="120"
            placeholder="juan@empresa.com"
            :disabled="disabled"
            class="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition disabled:opacity-50"
            @input="updatePartner(i, 'email', $event.target.value)"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-neutral-700 mb-1">% de distribución</label>
          <div class="flex items-center gap-2">
            <input
              :value="partner.percentage"
              type="number"
              min="0"
              max="100"
              step="1"
              placeholder="0"
              :disabled="disabled"
              class="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition disabled:opacity-50 text-right font-semibold tabular-nums"
              @input="updatePartner(i, 'percentage', Number($event.target.value))"
            />
            <span class="text-sm font-semibold text-neutral-500 shrink-0">%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Botón agregar -->
    <button
      type="button"
      :disabled="disabled"
      class="w-full py-3 px-4 rounded-xl border-2 border-dashed border-neutral-200 text-neutral-500 text-sm font-medium min-h-[48px] flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition disabled:opacity-50"
      @click="addPartner"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Agregar socio
    </button>

    <!-- Total combinado (empresa + socios) -->
    <div
      class="flex items-center justify-between px-4 py-3 rounded-xl border"
      :class="totalValid
        ? 'bg-green-50 border-green-200'
        : 'bg-red-50 border-red-200'"
    >
      <div class="flex items-center gap-2">
        <svg
          v-if="totalValid"
          class="w-4 h-4 text-status-success"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
        >
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <svg
          v-else
          class="w-4 h-4 text-status-error"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
        >
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span class="text-sm font-medium" :class="totalValid ? 'text-status-success' : 'text-status-error'">
          {{ totalValid
            ? 'Distribución completa'
            : remaining > 0
              ? `Faltan ${remaining}% por asignar`
              : `Exceso de ${-remaining}%` }}
        </span>
      </div>
      <span class="text-base font-bold tabular-nums" :class="totalValid ? 'text-status-success' : 'text-status-error'">
        {{ total }}%
      </span>
    </div>

  </div>
</template>
