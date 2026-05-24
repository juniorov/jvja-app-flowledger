import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/modules/auth/LoginView.vue'),
    meta: { public: true },
  },
  {
    // Ruta pública de aceptación de invitación.
    // skipAuthRedirect evita que usuarios autenticados sean redirigidos a /balance.
    path: '/invite/:token',
    name: 'invite',
    component: () => import('@/modules/workspace/InviteView.vue'),
    meta: { public: true, skipAuthRedirect: true },
  },
  {
    path: '/workspace/setup',
    name: 'workspace-setup',
    component: () => import('@/modules/workspace/WorkspaceSetupView.vue'),
    meta: { requiresAuth: true, skipWorkspaceCheck: true },
  },
  {
    path: '/',
    component: () => import('@/shared/components/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/balance',
      },
      {
        path: 'balance',
        name: 'balance',
        component: () => import('@/modules/periods/PeriodsView.vue'),
      },
      {
        path: 'movimientos',
        name: 'movimientos',
        component: () => import('@/modules/transactions/TransactionsView.vue'),
      },
      {
        path: 'movimientos/nueva',
        name: 'transaccion-nueva',
        component: () => import('@/modules/transactions/TransactionFormView.vue'),
      },
      {
        path: 'movimientos/:id/editar',
        name: 'transaccion-editar',
        component: () => import('@/modules/transactions/TransactionFormView.vue'),
      },
      {
        path: 'importar',
        name: 'importar',
        component: () => import('@/modules/transactions/ImportExcelView.vue'),
      },
      {
        path: 'perfil',
        name: 'perfil',
        component: () => import('@/modules/workspace/WorkspaceSettingsView.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const workspaceStore = useWorkspaceStore()

  // Rutas públicas
  if (to.meta.public) {
    // Redirigir a la app solo si está autenticado Y la ruta no es la de invitación
    if (auth.user && !to.meta.skipAuthRedirect) return { path: '/balance' }
    return
  }

  // Rutas protegidas: verificar autenticación
  if (!auth.user) {
    return { name: 'login' }
  }

  // Tras login: si hay una invitación pendiente en sessionStorage, redirigir a ella
  // Se verifica antes del workspace check para que un usuario nuevo no caiga en /workspace/setup
  const pendingInvite = sessionStorage.getItem('pendingInvite')
  if (pendingInvite && to.name !== 'invite') {
    sessionStorage.removeItem('pendingInvite')
    return { name: 'invite', params: { token: pendingInvite } }
  }

  // Cargar workspace si no está en memoria (una sola vez por sesión)
  if (!workspaceStore.hasWorkspace) {
    await workspaceStore.fetchWorkspace(auth.user.uid)
  }

  // Sin workspace → onboarding (excepto si ya va hacia setup)
  if (!workspaceStore.hasWorkspace && !to.meta.skipWorkspaceCheck) {
    return { name: 'workspace-setup' }
  }

  // Con workspace → no volver a setup
  if (workspaceStore.hasWorkspace && to.name === 'workspace-setup') {
    return { path: '/balance' }
  }
})

export default router
