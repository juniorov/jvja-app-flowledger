import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/useAuthStore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Esperar a que Firebase resuelva el estado de auth antes de montar
const auth = useAuthStore()
auth.init().then(() => {
  app.mount('#app')
})
