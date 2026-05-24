<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { getInvitation, acceptInvitation } from '@/services/invitation.service'
import { addMember } from '@/services/workspace.service'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const workspaceStore = useWorkspaceStore()

const token = route.params.token
const invitation = ref(null)
const loadingInvite = ref(true)
const inviteError = ref('') // 'not-found' | 'expired' | 'used'
const accepting = ref(false)
const acceptError = ref('')
const accepted = ref(false)

/**
 * 'mismatch' si el usuario logueado tiene un email distinto al de la invitación.
 */
const emailMismatch = computed(() => {
  if (!auth.user || !invitation.value) return false
  return auth.user.email.toLowerCase() !== invitation.value.email.toLowerCase()
})

const roleLabel = computed(() =>
  invitation.value?.role === 'admin' ? 'Administrador' : 'Visor'
)

onMounted(async () => {
  try {
    const inv = await getInvitation(token)

    if (!inv) {
      inviteError.value = 'not-found'
      return
    }

    if (inv.status === 'accepted') {
      inviteError.value = 'used'
      return
    }

    const expired = inv.status === 'expired' || (inv.expiresAt && new Date() > inv.expiresAt)
    if (expired) {
      inviteError.value = 'expired'
      return
    }

    invitation.value = inv

    // Guardar token en sessionStorage para redirigir tras el login si el usuario no está autenticado
    if (!auth.user) {
      sessionStorage.setItem('pendingInvite', token)
    }
  } catch (err) {
    inviteError.value = 'not-found'
    console.error('[InviteView] Error al leer invitación:', err)
  } finally {
    loadingInvite.value = false
  }
})

async function handleAccept() {
  if (!auth.user || !invitation.value) return
  accepting.value = true
  acceptError.value = ''
  try {
    const { workspaceId, role } = invitation.value

    // 1. Agregar el uid al map members del workspace (PRIMERO: si falla, la invitación sigue disponible)
    await addMember(workspaceId, auth.user.uid, auth.user.email, role)

    // 2. Asociar el workspace al usuario en users/{uid}
    await setDoc(
      doc(db, 'users', auth.user.uid),
      { currentWorkspaceId: workspaceId },
      { merge: true }
    )

    // 3. Marcar la invitación como aceptada (solo después de unirse exitosamente)
    await acceptInvitation(token)

    // 4. Recargar el workspace en el store para que la app lo refleje
    await workspaceStore.fetchWorkspace(auth.user.uid)

    // Verificar que el workspace se cargó correctamente
    if (!workspaceStore.hasWorkspace) {
      throw new Error('No se pudo cargar el workspace después de unirse.')
    }

    sessionStorage.removeItem('pendingInvite')
    accepted.value = true

    setTimeout(() => router.push('/balance'), 1800)
  } catch (err) {
    acceptError.value = 'No se pudo aceptar la invitación. Intentá de nuevo.'
    console.error('[InviteView] handleAccept error:', err)
  } finally {
    accepting.value = false
  }
}

function goToLogin() {
  // El token ya está guardado en sessionStorage desde onMounted
  router.push('/login')
}

function goToHome() {
  router.push(auth.user ? '/balance' : '/login')
}
</script>

<template>
  <div class="min-h-svh bg-neutral-50 flex flex-col items-center justify-center px-4 py-10">

    <!-- Logo / branding -->
    <div class="mb-8 flex items-center gap-2">
      <div class="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
        <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      </div>
      <span class="text-lg font-bold text-neutral-900 tracking-tight">Flowledger</span>
    </div>

    <!-- Loading -->
    <div v-if="loadingInvite" class="flex flex-col items-center gap-3">
      <svg class="w-7 h-7 text-primary animate-spin" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <p class="text-sm text-neutral-500">Verificando invitación…</p>
    </div>

    <!-- ── Estados de error ──────────────────────────────────────────── -->

    <!-- No encontrada -->
    <div
      v-else-if="inviteError === 'not-found'"
      class="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 text-center space-y-4"
    >
      <div class="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto">
        <svg class="w-6 h-6 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div>
        <p class="font-semibold text-neutral-900">Invitación no encontrada</p>
        <p class="text-sm text-neutral-500 mt-1">Este link no existe o ya fue eliminado.</p>
      </div>
      <button
        type="button"
        class="w-full py-3 rounded-xl bg-neutral-100 text-neutral-700 font-semibold text-sm min-h-[48px] hover:bg-neutral-200 transition"
        @click="goToHome"
      >
        Ir al inicio
      </button>
    </div>

    <!-- Expirada -->
    <div
      v-else-if="inviteError === 'expired'"
      class="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 text-center space-y-4"
    >
      <div class="w-12 h-12 rounded-2xl bg-status-warning/10 flex items-center justify-center mx-auto">
        <svg class="w-6 h-6 text-status-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <div>
        <p class="font-semibold text-neutral-900">Invitación expirada</p>
        <p class="text-sm text-neutral-500 mt-1">Este link venció. Pedile al administrador que genere uno nuevo.</p>
      </div>
      <button
        type="button"
        class="w-full py-3 rounded-xl bg-neutral-100 text-neutral-700 font-semibold text-sm min-h-[48px] hover:bg-neutral-200 transition"
        @click="goToHome"
      >
        Ir al inicio
      </button>
    </div>

    <!-- Ya utilizada -->
    <div
      v-else-if="inviteError === 'used'"
      class="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 text-center space-y-4"
    >
      <div class="w-12 h-12 rounded-2xl bg-status-success/10 flex items-center justify-center mx-auto">
        <svg class="w-6 h-6 text-status-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div>
        <p class="font-semibold text-neutral-900">Invitación ya utilizada</p>
        <p class="text-sm text-neutral-500 mt-1">Esta invitación ya fue aceptada anteriormente.</p>
      </div>
      <button
        type="button"
        class="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm min-h-[48px] hover:bg-primary-c transition"
        @click="goToHome"
      >
        Ir al inicio
      </button>
    </div>

    <!-- ── Invitación válida ──────────────────────────────────────────── -->
    <div
      v-else-if="invitation"
      class="w-full max-w-sm space-y-4"
    >

      <!-- Card principal -->
      <div class="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-5">

        <!-- Header -->
        <div class="text-center">
          <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <svg class="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <p class="text-sm text-neutral-500">Te invitaron a unirte a</p>
          <p class="text-xl font-bold text-neutral-900 mt-0.5">{{ invitation.workspaceName }}</p>
        </div>

        <!-- Detalles -->
        <div class="space-y-2">
          <div class="flex items-center justify-between bg-neutral-50 rounded-xl px-4 py-3">
            <span class="text-sm text-neutral-500">Rol</span>
            <span
              class="text-xs font-bold px-2.5 py-1 rounded-full"
              :class="invitation.role === 'admin'
                ? 'bg-secondary-purple/10 text-secondary-purple'
                : 'bg-neutral-100 text-neutral-600'"
            >
              {{ roleLabel }}
            </span>
          </div>
          <div class="flex items-center justify-between bg-neutral-50 rounded-xl px-4 py-3">
            <span class="text-sm text-neutral-500">Invitación para</span>
            <span class="text-sm font-medium text-neutral-700 truncate max-w-[180px]">{{ invitation.email }}</span>
          </div>
        </div>

        <!-- ── Usuario no autenticado ── -->
        <template v-if="!auth.user">
          <p class="text-xs text-neutral-400 text-center">
            Necesitás iniciar sesión con <strong>{{ invitation.email }}</strong> para aceptar.
          </p>
          <button
            type="button"
            class="w-full py-3 rounded-xl bg-primary hover:bg-primary-c text-white font-semibold text-sm min-h-[48px] transition"
            @click="goToLogin"
          >
            Iniciar sesión para aceptar
          </button>
        </template>

        <!-- ── Email no coincide ── -->
        <template v-else-if="emailMismatch">
          <div class="flex items-start gap-2 bg-status-warning/10 rounded-xl px-3 py-3">
            <svg class="w-4 h-4 text-status-warning mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p class="text-xs text-neutral-700">
              Esta invitación es para <strong>{{ invitation.email }}</strong>, pero estás autenticado como <strong>{{ auth.user.email }}</strong>.
            </p>
          </div>
        </template>

        <!-- ── Email coincide → aceptar ── -->
        <template v-else>
          <!-- Éxito -->
          <div
            v-if="accepted"
            class="flex items-center gap-2 justify-center text-status-success py-2"
          >
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span class="text-sm font-semibold">¡Bienvenido/a! Redirigiendo…</span>
          </div>

          <template v-else>
            <!-- Error de aceptación -->
            <div
              v-if="acceptError"
              class="text-sm text-status-error bg-status-error/10 rounded-xl px-3 py-2.5"
            >
              {{ acceptError }}
            </div>

            <button
              type="button"
              :disabled="accepting"
              class="w-full py-3 rounded-xl bg-primary hover:bg-primary-c text-white font-semibold text-sm min-h-[48px] transition disabled:opacity-50"
              @click="handleAccept"
            >
              <span v-if="accepting" class="flex items-center justify-center gap-2">
                <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Aceptando…
              </span>
              <span v-else>Aceptar invitación</span>
            </button>
          </template>
        </template>

      </div>
    </div>

  </div>
</template>
