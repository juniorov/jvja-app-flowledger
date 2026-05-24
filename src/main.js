import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/useAuthStore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// IMPORTANTE: resolver el estado de auth ANTES de instalar el router.
// Vue Router 4 dispara la navegación inicial en el mismo tick de app.use(router),
// por lo que el guard correría con auth.user === null si el router se instala primero.
const authStore = useAuthStore()
authStore.init().then(() => {
  app.use(router)
  app.mount('#app')
})
