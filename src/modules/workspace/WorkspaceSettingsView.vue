<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { updateWorkspace } from '@/services/workspace.service'
import { createInvitation } from '@/services/invitation.service'
import PartnersEditor from '@/shared/components/PartnersEditor.vue'

const auth = useAuthStore()
const workspaceStore = useWorkspaceStore()
const router = useRouter()

// ── Estado local de participantes (copia editable) ────────────────────────────
const company = ref({ id: 'company', type: 'company', name: 'Empresa', percentage: 0 })
const partners = ref([])
const savingParticipants = ref(false)
const participantsError = ref('')
const participantsSaved = ref(false)

/**
 * Inicializa las copias locales desde el workspace.
 * Maneja migración de participantes sin campo `type`:
 * - Si id === 'company' → type: 'company'
 * - En caso contrario → type: 'partner'
 */
watch(
  () => workspaceStore.workspace?.partners,
  (incoming) => {
    if (!incoming) return

    const companyParticipant = incoming.find((p) => p.id === 'company')
    const partnerParticipants = incoming.filter((p) => p.id !== 'company')

    company.value = {
      id: 'company',
      type: 'company',
      name: companyParticipant?.name ?? 'Empresa',
      percentage: companyParticipant?.percentage ?? 0,
    }

    partners.value = partnerParticipants.map((p) => ({
      id: p.id ?? crypto.randomUUID(),
      type: 'partner',
      name: p.name ?? '',
      lastName: p.lastName ?? '',
      email: p.email ?? '',
      percentage: p.percentage ?? 0,
    }))
  },
  { immediate: true }
)

const totalPercentage = computed(() =>
  company.value.percentage +
  partners.value.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0)
)

const participantsValid = computed(() => {
  if (totalPercentage.value !== 100) return false
  if (!company.value.name.trim()) return false
  return partners.value.every((p) => p.name.trim().length >= 1)
})

async function saveParticipants() {
  if (!participantsValid.value) {
    participantsError.value = 'Los porcentajes deben sumar 100% y cada participante necesita un nombre.'
    return
  }

  savingParticipants.value = true
  participantsError.value = ''
  participantsSaved.value = false

  try {
    // Componer array completo: company primero, luego partners
    const participants = [
      {
        id: company.value.id,
        type: company.value.type,
        name: company.value.name.trim(),
        percentage: Number(company.value.percentage),
      },
      ...partners.value.map((p) => ({
        id: p.id,
        type: p.type,
        name: p.name.trim(),
        lastName: p.lastName.trim(),
        email: p.email.trim().toLowerCase(),
        percentage: Number(p.percentage),
      })),
    ]

    await updateWorkspace(workspaceStore.workspaceId, { partners: participants })

    workspaceStore.setWorkspace({
      ...workspaceStore.workspace,
      partners: participants,
    })

    participantsSaved.value = true
    setTimeout(() => { participantsSaved.value = false }, 3000)
  } catch (err) {
    participantsError.value = 'No se pudo guardar. Intentá de nuevo.'
    console.error(err)
  } finally {
    savingParticipants.value = false
  }
}

// ── Miembros del workspace ────────────────────────────────────────────────────

const members = computed(() =>
  Object.entries(workspaceStore.workspace?.members ?? {}).map(([uid, data]) => ({
    uid,
    email: data.email,
    role: data.role,
    isCurrentUser: uid === auth.user?.uid,
  }))
)

// ── Invitaciones ──────────────────────────────────────────────────────────────

const showInviteForm = ref(false)
const invitePartnerId = ref('')
const inviteRole = ref('viewer')
const inviting = ref(false)
const inviteError = ref('')
const inviteLink = ref('')
const linkCopied = ref(false)

// Emails de miembros actuales para excluirlos del dropdown
const memberEmails = computed(() =>
  Object.values(workspaceStore.workspace?.members ?? {}).map(m => m.email.toLowerCase())
)

// Socios con email configurado que aún no son miembros del workspace
const invitablePartners = computed(() =>
  partners.value
    .filter(p => p.email)
    .filter(p => !memberEmails.value.includes(p.email.toLowerCase()))
    .map(p => ({
      ...p,
      label: [p.name, p.lastName].filter(Boolean).join(' '),
    }))
)

const selectedPartner = computed(() =>
  invitablePartners.value.find(p => p.id === invitePartnerId.value) ?? null
)

function openInviteForm() {
  showInviteForm.value = true
  inviteLink.value = ''
  inviteError.value = ''
  invitePartnerId.value = ''
  inviteRole.value = 'viewer'
}

function closeInviteForm() {
  showInviteForm.value = false
  inviteLink.value = ''
  invitePartnerId.value = ''
  inviteError.value = ''
}

async function sendInvite() {
  if (!invitePartnerId.value || !selectedPartner.value) {
    inviteError.value = 'Seleccioná un socio para invitar.'
    return
  }
  inviting.value = true
  inviteError.value = ''
  inviteLink.value = ''
  try {
    const token = await createInvitation({
      email: selectedPartner.value.email,
      workspaceId: workspaceStore.workspaceId,
      workspaceName: workspaceStore.workspace.name,
      role: inviteRole.value,
      createdBy: auth.user.uid,
    })
    inviteLink.value = `${window.location.origin}/invite/${token}`
  } catch (err) {
    inviteError.value = 'No se pudo crear la invitación. Intentá de nuevo.'
    console.error('[WorkspaceSettings] sendInvite error:', err)
  } finally {
    inviting.value = false
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    linkCopied.value = true
    setTimeout(() => { linkCopied.value = false }, 2500)
  } catch {
    // fallback: seleccionar el texto
  }
}

async function handleLogout() {
  workspaceStore.clearWorkspace()
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex flex-col min-h-full">

    <!-- Header -->
    <header class="sticky top-0 z-10 bg-white border-b border-neutral-100 px-4 pt-4 pb-3">
      <h1 class="text-xl font-bold text-neutral-900">Perfil</h1>
    </header>

    <div class="px-4 py-4 space-y-5">

      <!-- Cuenta del usuario -->
      <div class="bg-white rounded-xl border border-neutral-200 shadow-sm p-4">
        <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Cuenta</p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span class="text-base font-bold text-primary">
              {{ (auth.user?.displayName || auth.user?.email || '?')[0].toUpperCase() }}
            </span>
          </div>
          <div class="min-w-0">
            <p class="font-semibold text-neutral-900 truncate">{{ auth.user?.displayName || '—' }}</p>
            <p class="text-sm text-neutral-500 truncate">{{ auth.user?.email }}</p>
          </div>
        </div>
      </div>

      <!-- Empresa -->
      <div v-if="workspaceStore.workspace" class="bg-white rounded-xl border border-neutral-200 shadow-sm p-4">
        <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Workspace</p>
        <p class="font-semibold text-neutral-900">{{ workspaceStore.workspace.name }}</p>
        <p class="text-sm text-neutral-500 mt-0.5">
          Moneda por defecto:
          <span class="font-medium text-neutral-700">{{ workspaceStore.workspace.baseCurrency }}</span>
        </p>
      </div>

      <!-- ── Sección socios / miembros ─────────────────────────────── -->
      <div v-if="workspaceStore.workspace" class="space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-base font-bold text-neutral-900">Socios con acceso</p>
          <button
            v-if="workspaceStore.currentUserIsAdmin"
            type="button"
            class="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-c transition"
            @click="openInviteForm"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Invitar socio
          </button>
        </div>

        <!-- Lista de miembros -->
        <div class="bg-white rounded-xl border border-neutral-200 shadow-sm divide-y divide-neutral-100">
          <div
            v-for="m in members"
            :key="m.uid"
            class="flex items-center gap-3 px-4 py-3"
          >
            <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span class="text-xs font-bold text-primary">
                {{ (m.email || '?')[0].toUpperCase() }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-neutral-900 truncate">{{ m.email }}</p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                :class="m.role === 'admin'
                  ? 'bg-secondary-purple/10 text-secondary-purple'
                  : 'bg-neutral-100 text-neutral-500'"
              >
                {{ m.role === 'admin' ? 'Admin' : 'Visor' }}
              </span>
              <span
                v-if="m.isCurrentUser"
                class="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full"
              >
                tú
              </span>
            </div>
          </div>
        </div>

        <!-- Formulario de invitación -->
        <div
          v-if="showInviteForm"
          class="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 space-y-3"
        >
          <p class="text-sm font-semibold text-neutral-900">Nueva invitación</p>

          <!-- Sin socios disponibles -->
          <div
            v-if="invitablePartners.length === 0"
            class="flex items-start gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-3"
          >
            <svg class="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p class="text-xs text-neutral-500">
              No hay socios disponibles para invitar. Asegurate de que cada socio tenga email configurado en la sección de Participantes.
            </p>
          </div>

          <!-- Dropdown de socios -->
          <div v-else>
            <label class="block text-xs font-medium text-neutral-700 mb-1">Socio a invitar</label>
            <div class="relative">
              <select
                v-model="invitePartnerId"
                :disabled="inviting || !!inviteLink"
                class="w-full px-3 py-2.5 pr-9 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition disabled:opacity-50 appearance-none"
              >
                <option value="" disabled>Seleccioná un socio…</option>
                <option v-for="p in invitablePartners" :key="p.id" :value="p.id">
                  {{ p.label }}
                </option>
              </select>
              <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            <p v-if="selectedPartner" class="text-[11px] text-neutral-400 mt-1 truncate">
              {{ selectedPartner.email }}
            </p>
          </div>

          <!-- Rol -->
          <div>
            <label class="block text-xs font-medium text-neutral-700 mb-1">Rol</label>
            <div class="flex gap-2">
              <button
                type="button"
                class="flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition min-h-[44px]"
                :class="inviteRole === 'viewer'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-neutral-200 text-neutral-500'"
                :disabled="inviting || !!inviteLink"
                @click="inviteRole = 'viewer'"
              >
                Visor
              </button>
              <button
                type="button"
                class="flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition min-h-[44px]"
                :class="inviteRole === 'admin'
                  ? 'border-secondary-purple bg-secondary-purple/10 text-secondary-purple'
                  : 'border-neutral-200 text-neutral-500'"
                :disabled="inviting || !!inviteLink"
                @click="inviteRole = 'admin'"
              >
                Administrador
              </button>
            </div>
            <p class="text-[11px] text-neutral-400 mt-1">
              <template v-if="inviteRole === 'admin'">Puede crear invitaciones, editar y eliminar transacciones.</template>
              <template v-else>Solo puede ver los movimientos y balances.</template>
            </p>
          </div>

          <!-- Error -->
          <div
            v-if="inviteError"
            class="text-sm text-status-error bg-status-error/10 rounded-lg px-3 py-2"
          >
            {{ inviteError }}
          </div>

          <!-- Link generado -->
          <div v-if="inviteLink" class="space-y-2">
            <p class="text-xs font-semibold text-status-success flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Invitación creada. Copiá el link y compartilo.
            </p>
            <div class="flex gap-2 items-stretch">
              <div class="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-600 font-mono truncate flex items-center">
                {{ inviteLink }}
              </div>
              <button
                type="button"
                class="shrink-0 px-3 py-2 rounded-lg font-semibold text-xs min-h-[44px] transition"
                :class="linkCopied
                  ? 'bg-status-success/10 text-status-success'
                  : 'bg-primary text-white hover:bg-primary-c'"
                @click="copyLink"
              >
                {{ linkCopied ? '¡Copiado!' : 'Copiar' }}
              </button>
            </div>
            <p class="text-[11px] text-neutral-400">El link expira en 7 días.</p>
          </div>

          <!-- Acciones del form -->
          <div class="flex gap-2 pt-1">
            <button
              v-if="!inviteLink"
              type="button"
              :disabled="inviting || invitablePartners.length === 0"
              class="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary-c text-white font-semibold text-sm min-h-[44px] transition disabled:opacity-50"
              @click="sendInvite"
            >
              <span v-if="inviting" class="flex items-center justify-center gap-2">
                <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Creando…
              </span>
              <span v-else>Crear invitación</span>
            </button>
            <button
              type="button"
              class="px-4 py-2.5 rounded-lg border border-neutral-200 text-neutral-600 font-semibold text-sm min-h-[44px] hover:bg-neutral-50 transition"
              @click="closeInviteForm"
            >
              {{ inviteLink ? 'Cerrar' : 'Cancelar' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Sección participantes ───────────────────────────────── -->
      <div class="space-y-4">
        <p class="text-base font-bold text-neutral-900">Participantes</p>

        <!-- Card empresa (no eliminable) -->
        <div class="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
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
            <div>
              <label class="block text-xs font-medium text-neutral-700 mb-1">Nombre visible en reportes</label>
              <input
                v-model="company.name"
                type="text"
                maxlength="60"
                placeholder="Empresa"
                :disabled="savingParticipants"
                class="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition disabled:opacity-50"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-neutral-700 mb-1">% de reserva empresarial</label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="company.percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  :disabled="savingParticipants"
                  class="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition disabled:opacity-50 text-right font-semibold tabular-nums"
                />
                <span class="text-sm font-semibold text-neutral-500 shrink-0">%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Editor de socios -->
        <PartnersEditor
          v-model="partners"
          :company-percentage="Number(company.percentage) || 0"
          :disabled="savingParticipants"
        />

        <!-- Error -->
        <div
          v-if="participantsError"
          role="alert"
          class="flex items-start gap-2 text-sm text-status-error bg-red-50 rounded-xl px-3 py-2.5"
        >
          <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ participantsError }}
        </div>

        <!-- Éxito -->
        <div
          v-if="participantsSaved"
          class="flex items-center gap-2 text-sm text-status-success bg-green-50 rounded-xl px-3 py-2.5"
        >
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Cambios guardados correctamente.
        </div>

        <!-- Botón guardar -->
        <button
          type="button"
          :disabled="savingParticipants || !participantsValid"
          class="w-full py-3 px-4 rounded-lg bg-primary hover:bg-primary-c text-white font-semibold text-sm min-h-[48px] transition-colors disabled:bg-neutral-200 disabled:text-neutral-500 disabled:cursor-not-allowed"
          @click="saveParticipants"
        >
          <span v-if="savingParticipants" class="flex items-center justify-center gap-2">
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Guardando...
          </span>
          <span v-else>Guardar participantes</span>
        </button>
      </div>

      <!-- Cerrar sesión -->
      <button
        type="button"
        class="w-full py-3 px-4 rounded-lg bg-red-50 text-status-error font-semibold text-sm min-h-[48px] transition hover:bg-red-100"
        @click="handleLogout"
      >
        Cerrar sesión
      </button>

    </div>
  </div>
</template>
