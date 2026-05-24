<script setup>
import { computed } from 'vue'
import { formatAmount } from '@/shared/utils/formatters'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

const props = defineProps({
  totalIncome:        { type: Number, default: 0 },
  totalExpense:       { type: Number, default: 0 },
  balance:            { type: Number, default: 0 },
  distributableIncome:{ type: Number, default: 0 },
  totalFixedCosts:    { type: Number, default: 0 },
  netDistributable:   { type: Number, default: 0 },
  currency:           { type: String, default: 'CRC' },
  showDistribution:   { type: Boolean, default: false },
})

const workspaceStore = useWorkspaceStore()

// Separar participantes por tipo
const companyParticipant = computed(() =>
  workspaceStore.workspace?.partners?.find((p) => p.type === 'company' || p.id === 'company') ?? null
)

const partnerParticipants = computed(() =>
  (workspaceStore.workspace?.partners ?? []).filter((p) => p.type === 'partner' && p.id !== 'company')
)

const hasDistribution = computed(() =>
  props.showDistribution &&
  props.netDistributable > 0 &&
  (companyParticipant.value || partnerParticipants.value.length > 0)
)

function participantAmount(percentage) {
  return (props.netDistributable * percentage) / 100
}
</script>

<template>
  <div class="space-y-3">

    <!-- Ingresos / Egresos -->
    <div class="grid grid-cols-2 gap-2">
      <div class="bg-green-50 rounded-xl px-4 py-3">
        <p class="text-[11px] font-semibold text-status-success uppercase tracking-wide">Ingresos</p>
        <p class="text-base font-bold text-status-success tabular-nums mt-0.5 truncate">
          {{ formatAmount(totalIncome, currency) }}
        </p>
      </div>
      <div class="bg-red-50 rounded-xl px-4 py-3">
        <p class="text-[11px] font-semibold text-status-error uppercase tracking-wide">Egresos</p>
        <p class="text-base font-bold text-status-error tabular-nums mt-0.5 truncate">
          {{ formatAmount(totalExpense, currency) }}
        </p>
      </div>
    </div>

    <!-- Saldo neto -->
    <div
      class="rounded-xl px-4 py-4"
      :class="balance >= 0 ? 'bg-primary/10' : 'bg-red-50'"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide"
             :class="balance >= 0 ? 'text-primary' : 'text-status-error'">
            Saldo neto
          </p>
          <p class="text-2xl font-extrabold tabular-nums mt-0.5"
             :class="balance >= 0 ? 'text-primary' : 'text-status-error'">
            {{ formatAmount(balance, currency) }}
          </p>
        </div>
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center"
          :class="balance >= 0 ? 'bg-primary/20' : 'bg-red-100'"
        >
          <svg class="w-5 h-5" :class="balance >= 0 ? 'text-primary' : 'text-status-error'"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- ── Distribución (dos secciones separadas) ── -->
    <template v-if="hasDistribution">

      <!-- Detalle de la base distribuible -->
      <div class="bg-white rounded-xl border border-neutral-200 shadow-sm px-4 py-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Base distribuible</span>
          <span class="text-sm font-bold text-neutral-900 tabular-nums">
            {{ formatAmount(distributableIncome, currency) }}
          </span>
        </div>
        <div v-if="totalFixedCosts > 0" class="flex items-center justify-between mt-1.5">
          <span class="text-xs text-neutral-400">− Costos fijos</span>
          <span class="text-xs font-medium text-status-error tabular-nums">
            − {{ formatAmount(totalFixedCosts, currency) }}
          </span>
        </div>
        <div class="flex items-center justify-between mt-1.5 pt-1.5 border-t border-neutral-100">
          <span class="text-xs font-semibold text-neutral-700">Neto a repartir</span>
          <span class="text-sm font-bold text-neutral-900 tabular-nums">
            {{ formatAmount(netDistributable, currency) }}
          </span>
        </div>
      </div>

      <!-- Sección 1: Capital empresa -->
      <div v-if="companyParticipant" class="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div class="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-neutral-100">
          <div class="w-4 h-4 rounded bg-primary/10 flex items-center justify-center shrink-0">
            <svg class="w-2.5 h-2.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <p class="text-xs font-semibold text-primary uppercase tracking-wide">Capital empresa</p>
        </div>
        <div class="px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sm text-neutral-700">{{ companyParticipant.name }}</span>
            <span class="text-xs text-neutral-400">{{ companyParticipant.percentage }}%</span>
          </div>
          <span class="text-base font-bold text-neutral-900 tabular-nums">
            {{ formatAmount(participantAmount(companyParticipant.percentage), currency) }}
          </span>
        </div>
      </div>

      <!-- Sección 2: Distribución socios -->
      <div v-if="partnerParticipants.length > 0" class="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div class="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-neutral-100">
          <div class="w-4 h-4 rounded bg-secondary-purple/10 flex items-center justify-center shrink-0">
            <svg class="w-2.5 h-2.5 text-secondary-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p class="text-xs font-semibold text-secondary-purple uppercase tracking-wide">Distribución socios</p>
        </div>
        <div class="divide-y divide-neutral-100">
          <div
            v-for="partner in partnerParticipants"
            :key="partner.id"
            class="px-4 py-3 flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-secondary-purple/10 flex items-center justify-center shrink-0">
                <span class="text-[10px] font-bold text-secondary-purple">
                  {{ (partner.name || '?')[0].toUpperCase() }}
                </span>
              </div>
              <div>
                <span class="text-sm text-neutral-700">{{ partner.name }}</span>
                <span class="text-xs text-neutral-400 ml-1.5">{{ partner.percentage }}%</span>
              </div>
            </div>
            <span class="text-sm font-bold text-neutral-900 tabular-nums">
              {{ formatAmount(participantAmount(partner.percentage), currency) }}
            </span>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>
