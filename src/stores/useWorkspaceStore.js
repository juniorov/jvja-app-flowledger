import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  getUserWorkspaceId,
  getWorkspace,
  isMember,
  isAdmin,
} from '@/services/workspace.service'

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspace = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const workspaceId = computed(() => workspace.value?.id ?? null)
  const hasWorkspace = computed(() => !!workspace.value)

  /**
   * True si el usuario autenticado es miembro del workspace activo.
   * Usa el map members[uid] — compatible con reglas de Firestore.
   */
  const currentUserIsMember = computed(() => {
    const auth = useAuthStore()
    return isMember(workspace.value, auth.user?.uid)
  })

  /**
   * True si el usuario autenticado tiene rol 'admin' en el workspace activo.
   */
  const currentUserIsAdmin = computed(() => {
    const auth = useAuthStore()
    return isAdmin(workspace.value, auth.user?.uid)
  })

  /**
   * Carga el workspace activo del usuario.
   * @param {string} uid
   * @returns {Promise<boolean>} true si tiene workspace
   */
  async function fetchWorkspace(uid) {
    loading.value = true
    error.value = null
    try {
      const wsId = await getUserWorkspaceId(uid)
      if (!wsId) {
        workspace.value = null
        return false
      }
      const ws = await getWorkspace(wsId)
      workspace.value = ws
      return !!ws
    } catch (err) {
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  function setWorkspace(data) {
    workspace.value = data
  }

  function clearWorkspace() {
    workspace.value = null
  }

  return {
    workspace,
    loading,
    error,
    workspaceId,
    hasWorkspace,
    currentUserIsMember,
    currentUserIsAdmin,
    fetchWorkspace,
    setWorkspace,
    clearWorkspace,
  }
})
