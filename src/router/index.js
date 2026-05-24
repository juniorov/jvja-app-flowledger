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

  // Rutas públicas: redirigir a la app si ya está autenticado
  if (to.meta.public) {
    if (auth.user) return { path: '/balance' }
    return
  }

  // Rutas protegidas: verificar autenticación
  if (!auth.user) {
    return { name: 'login' }
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
