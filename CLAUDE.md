# CLAUDE.md — jvja-app-flowledger

## Descripción del proyecto

**Flowledger** es una PWA de control financiero multi-tenant construida con Vue 3 + Vite.
Permite registrar entradas y salidas de dinero, importar extractos bancarios en Excel,
y calcular la liquidación porcentual entre socios. Está diseñada para escalar como SaaS
ligero para pequeñas empresas costarricenses.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Build tool | Vite |
| PWA | `vite-plugin-pwa` |
| UI / Estilos | Tailwind CSS v4 |
| Auth | Firebase Authentication (Google + Email/Password) |
| Base de datos | Firebase Firestore |
| Estado global | Pinia |
| Routing | Vue Router 4 |
| Import Excel | SheetJS (`xlsx`) |
| Deploy | Netlify |

---

## Principios de desarrollo

### Mobile-first SIEMPRE
- Diseñar primero para pantallas de ~375px de ancho
- Usar clases responsivas de Tailwind en orden: base (mobile) → `sm:` → `md:` → `lg:`
- Navegación principal en bottom nav bar (no sidebar)
- Botones y áreas táctiles mínimo 44px de alto
- Formularios con inputs grandes, fáciles de tocar
- Evitar tablas horizontales en mobile; usar cards o listas verticales
- Los modales deben ser bottom sheets en mobile

### Tailwind CSS
- Usar utilidades de Tailwind directamente en el template, no CSS custom salvo casos excepcionales
- Paleta de colores definida en `tailwind.config.js` con variables semánticas
- Modo oscuro preparado desde el inicio con la clase `dark:`
- Componentes repetidos extraerlos como componentes Vue, no como clases `@apply`

### Vue 3
- Usar siempre Composition API con `<script setup>`
- Lógica reutilizable en composables (`src/composables/use*.js`)
- Nunca usar Options API
- Tipar con JSDoc cuando sea relevante (no TypeScript por simplicidad)

### Firebase
- Toda la lógica de Firestore en servicios (`src/services/*.js`), nunca directamente en componentes
- Credenciales de Firebase en variables de entorno (`.env`) — nunca hardcodeadas
- Usar `onSnapshot` para datos en tiempo real donde tenga sentido (balance, transacciones recientes)

### Arquitectura multi-tenant
- Cada empresa es un `workspace` independiente en Firestore
- Toda query de Firestore debe estar scoped bajo `workspaces/{workspaceId}`
- El `workspaceId` viene del estado global de Pinia (`useWorkspaceStore`)
- Un usuario puede pertenecer a múltiples workspaces (preparado para escalar)

---

## Estructura del proyecto

```
jvja-app-flowledger/
├── public/
│   ├── icons/                  # Íconos PWA (192x192, 512x512)
│   └── manifest.webmanifest    # generado por vite-plugin-pwa
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── router/
│   │   └── index.js
│   ├── stores/                 # Pinia stores
│   │   ├── useAuthStore.js
│   │   ├── useWorkspaceStore.js
│   │   └── useTransactionStore.js
│   ├── services/               # Lógica Firebase (Firestore, Auth)
│   │   ├── auth.service.js
│   │   ├── workspace.service.js
│   │   └── transaction.service.js
│   ├── composables/            # Lógica reutilizable Vue
│   │   ├── useCurrency.js      # Formateo CRC/USD, tipo de cambio
│   │   ├── useImportExcel.js   # Parseo de extracto BCR
│   │   └── useDistribution.js  # Cálculo liquidación socios
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── LoginView.vue
│   │   │   └── RegisterView.vue
│   │   ├── workspace/
│   │   │   ├── WorkspaceSetupView.vue   # Primera vez: crear workspace
│   │   │   └── WorkspaceSettingsView.vue
│   │   ├── transactions/
│   │   │   ├── TransactionsView.vue     # Lista principal
│   │   │   ├── TransactionDetailView.vue
│   │   │   ├── TransactionFormView.vue  # Crear/editar manual
│   │   │   └── ImportExcelView.vue      # Importar extracto bancario
│   │   ├── periods/
│   │   │   └── PeriodsView.vue          # Balance mes a mes
│   │   └── reports/
│   │       └── DistributionView.vue     # Liquidación por socio
│   ├── shared/
│   │   ├── components/
│   │   │   ├── AppLayout.vue            # Layout principal con bottom nav
│   │   │   ├── BottomNav.vue
│   │   │   ├── TransactionCard.vue      # Card de una transacción
│   │   │   ├── BalanceSummary.vue       # Resumen de saldo
│   │   │   ├── CurrencyBadge.vue
│   │   │   └── BottomSheet.vue          # Modal tipo bottom sheet
│   │   └── utils/
│   │       ├── formatters.js            # Fechas, montos
│   │       └── constants.js             # Códigos banco, monedas
│   └── firebase/
│       └── index.js                     # Inicialización Firebase
├── .env                                 # Variables de entorno Firebase (no commitear)
├── .env.example                         # Template de variables (sí commitear)
├── vite.config.js
├── tailwind.config.js
└── netlify.toml
```

---

## Modelo de datos Firestore

### `workspaces/{workspaceId}`
```js
{
  name: String,               // "Servicios Integrales JV & JA"
  baseCurrency: "CRC" | "USD",
  exchangeRate: Number,       // tipo de cambio manual CRC/USD
  createdAt: Timestamp,
  partners: [
    { id: String, name: String, percentage: Number }
    // Ejemplo: { id: "empresa", name: "Empresa", percentage: 40 }
    //          { id: "socioA",  name: "Socio A",  percentage: 30 }
    //          { id: "socioB",  name: "Socio B",  percentage: 30 }
  ],
  members: [
    { uid: String, email: String, role: "admin" | "viewer" }
  ]
}
```

### `workspaces/{workspaceId}/transactions/{txId}`
```js
{
  date: Timestamp,
  reference: String,           // número de referencia del banco
  code: String,                // TF, CP, MD, etc.
  description: String,         // texto original del banco (puede estar truncado)
  notes: String,               // campo libre del usuario para explicar el movimiento
  debit: Number,               // salida (débito)
  credit: Number,              // entrada (crédito)
  balance: Number,             // saldo después del movimiento
  currency: "CRC" | "USD",
  type: "income" | "expense",  // derivado de credit/debit
  isDistributable: Boolean,    // ¿este ingreso se reparte entre socios?
  fixedCosts: Number,          // costos a descontar antes de repartir (default: 0)
  importedFrom: String | null, // nombre del archivo Excel origen
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: String            // uid del usuario
}
```

### `workspaces/{workspaceId}/periods/{YYYY-MM}`
```js
{
  year: Number,
  month: Number,
  totalIncome: Number,
  totalExpense: Number,
  balance: Number,
  distributableIncome: Number,   // suma de créditos con isDistributable: true
  totalFixedCosts: Number,
  netDistributable: Number,      // distributableIncome - totalFixedCosts
  distribution: {
    empresa: Number,
    socioA: Number,
    socioB: Number
  },
  currency: "CRC" | "USD",
  closedAt: Timestamp | null,    // null = mes abierto
  updatedAt: Timestamp
}
```

---

## Lógica de distribución

Cuando `isDistributable: true` en una transacción de tipo `income`:

```
base = credit - fixedCosts
empresa = base * 0.40
socioA  = base * 0.30
socioB  = base * 0.30
```

Los porcentajes NO están hardcodeados — se leen siempre de `workspace.partners[].percentage`.

---

## Importador de Excel (extracto BCR)

El archivo exportado del BCR tiene esta estructura:
- Filas 0–10: metadata del banco (nombre cuenta, saldos, etc.) — **ignorar**
- Fila 11: encabezados reales (`Fecha`, `Referencia`, `Código`, `Descripción`, `Débitos`, `Créditos`, `Balance*`)
- Filas 12+: transacciones reales
- Al final: cuadro de resumen — **ignorar** (detectar por celda vacía en Fecha)

Mapeo de columnas del Excel a campos del modelo:
```
Unnamed: 0  → date         (formato dd/MM/yyyy)
Unnamed: 1  → reference
Unnamed: 3  → code         (TF, CP, MD...)
Unnamed: 4  → description  (puede estar truncada, OK)
Unnamed: 7  → debit
Unnamed: 8  → credit
Unnamed: 9  → balance
```

El importador debe:
1. Parsear el archivo con SheetJS del lado del cliente
2. Saltar las filas de metadata automáticamente
3. Mostrar preview de las transacciones antes de confirmar
4. Permitir editar `notes`, `isDistributable` y `fixedCosts` antes o después de importar
5. Detectar duplicados por `reference` + `date` y advertir al usuario
6. Guardar en batch en Firestore

---

## Flujos principales (UX mobile)

### Navegación (Bottom Nav — 4 tabs)
```
[📊 Balance] [📋 Movimientos] [📥 Importar] [👤 Perfil]
```

### Flujo de nuevo usuario
1. Login con Google o Email
2. Crear workspace (nombre empresa, socios y porcentajes)
3. Redirigir a Balance (vacío, con CTA para importar o agregar)

### Flujo de importación
1. Seleccionar archivo `.xls` / `.xlsx`
2. Preview en cards (no tabla) de las transacciones detectadas
3. Por cada transacción: editar notas, marcar si es distribuible, ingresar costos fijos
4. Confirmar importación → guardar en Firestore

### Flujo de edición de transacción
- Tap en una transacción → bottom sheet con detalle
- Botón editar → formulario inline o nueva pantalla
- Solo se pueden editar: `notes`, `isDistributable`, `fixedCosts`, `description`
- Los campos del banco (`date`, `reference`, `debit`, `credit`) son de solo lectura

---

## Multimoneda

- Monedas soportadas: `CRC` (₡) y `USD` ($)
- El tipo de cambio se configura manualmente en WorkspaceSettings
- Cada transacción guarda su propia moneda
- Los períodos y reportes muestran ambas monedas por separado (no convertir automáticamente)
- El formateo de montos usa `Intl.NumberFormat` con locale `es-CR`

---

## Reglas de seguridad Firestore

Copiar exactamente en Firebase Console → Firestore → Rules y publicar:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /workspaces/{workspaceId} {

      function isAuthenticated() {
        return request.auth != null;
      }

      function isMember() {
        return isAuthenticated() &&
          request.auth.uid in resource.data.members;
      }

      function isAdmin() {
        return isAuthenticated() &&
          resource.data.members[request.auth.uid].role == 'admin';
      }

      // Para subcollecciones: leer el workspace padre explícitamente
      // Firestore no hereda el contexto del documento padre en reglas de subcollecciones
      function isWorkspaceMember() {
        return isAuthenticated() &&
          request.auth.uid in get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.members;
      }

      function isWorkspaceAdmin() {
        return isAuthenticated() &&
          get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.members[request.auth.uid].role == 'admin';
      }

      allow create: if isAuthenticated();
      allow read: if isMember();
      allow update, delete: if isAdmin();

      match /{subcollection}/{document} {
        allow read: if isWorkspaceMember();
        allow create: if isWorkspaceMember();
        allow update, delete: if isWorkspaceAdmin();
      }
    }

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Notas importantes:**
- `members` debe ser un **map** con el uid como key: `{ [uid]: { email, role } }` — nunca un array
- La colección `users` es separada de `workspaces` y almacena `currentWorkspaceId` del usuario
- `allow create` en workspaces solo requiere autenticación — la validación del objeto se hace en el código

---

## Variables de entorno (.env)

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## Comandos del proyecto

```bash
npm run dev          # desarrollo local
npm run build        # build producción
npm run preview      # preview del build
```

---

## Configuración Netlify (netlify.toml)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Sistema de diseño

### Identidad visual
- Estilo: **moderno, limpio, minimalista funcional** — orientado a mobile, fácil de leer de un vistazo
- Modo claro por defecto, modo oscuro preparado con `dark:` de Tailwind
- Tipografía: **Inter** (Google Fonts) — legible en pantallas pequeñas
- Bordes redondeados consistentes: `rounded-xl` para cards, `rounded-lg` para botones e inputs
- Sombras suaves: `shadow-sm` para cards, sin sombras exageradas

---

### Paleta de colores

Configurar en `tailwind.config.js` bajo `theme.extend.colors`:

```js
colors: {
  primary: {
    DEFAULT: '#00ABA0',  // verde principal — botones, links, íconos activos
    b: '#00B5A9',
    c: '#00BDB0',        // hover states, backgrounds suaves
    d: '#4DC4BC',
    e: '#66CDC6',
    f: '#80D5CF',
  },
  secondary: {
    purple: {
      DEFAULT: '#8C3D88', // badges socios, etiquetas secundarias — usar con moderación
      b: '#A3459E',
      c: '#AD4CA8',
    },
    orange: {
      DEFAULT: '#FFA201', // usar muy puntualmente, no como color de interfaz general
      b: '#FFB330',
    },
  },
  neutral: {
    900: '#111111',  // texto principal
    800: '#333333',
    700: '#545454',
    500: '#6B6B6B',  // texto secundario
    400: '#7D7D7D',
    300: '#8F8F8F',
    200: '#C8C8C8',  // bordes
    100: '#EBEBEB',  // backgrounds alternativos
    50:  '#F5F5F5',  // background general
    0:   '#F9F9F9',
  },
  status: {
    error:   '#EB0000',  // débitos / egresos / errores críticos
    warning: '#FD9800',  // advertencias, pendientes
    success: '#31D472',  // créditos / ingresos / éxito
    info:    '#167BDE',  // información
  },
}
```

---

### Uso semántico de colores

| Elemento | Color |
|---|---|
| Botón primario | `primary.DEFAULT` (`#00ABA0`) |
| Hover de botón primario | `primary.c` (`#00BDB0`) |
| Crédito / Ingreso | `status.success` (`#31D472`) |
| Débito / Egreso | `status.error` (`#EB0000`) |
| Badge distribuible | `primary.DEFAULT` |
| Badge no distribuible | `neutral.400` |
| Badge socio A | `secondary.purple.DEFAULT` |
| Badge socio B | `secondary.purple.b` |
| Badge empresa | `primary.DEFAULT` |
| Texto principal | `neutral.900` |
| Texto secundario | `neutral.500` |
| Bordes | `neutral.200` |
| Background general | `neutral.50` |
| Background cards | `white` |
| Loading / skeleton | `neutral.100` |
| Error de formulario | `status.error` |
| Warning / alerta | `status.warning` |
| Confirmación / éxito | `status.success` |

---

### Componentes UI — guía de estilo

**Cards de transacción**
- Fondo blanco, `rounded-xl`, `shadow-sm`, padding `p-4`
- Monto en verde (`status.success`) si es crédito, rojo (`status.error`) si es débito
- Fecha y referencia en `neutral.500` (texto secundario)
- Badge de moneda (`CRC` / `USD`) con `primary.f` de fondo y `primary.DEFAULT` de texto

**Botones**
- Primario: fondo `primary.DEFAULT`, texto blanco, `rounded-lg`, alto mínimo 44px
- Secundario: borde `primary.DEFAULT`, texto `primary.DEFAULT`, fondo transparente
- Destructivo: fondo `status.error`, texto blanco
- Deshabilitado: `neutral.200` fondo, `neutral.500` texto

**Inputs y formularios**
- Border `neutral.200`, focus ring `primary.DEFAULT`
- Labels en `neutral.700`, placeholders en `neutral.400`
- Error state: border `status.error`, mensaje debajo en `status.error`
- Alto mínimo 48px para facilidad táctil

**Bottom Nav**
- Fondo blanco, borde superior `neutral.100`
- Ícono activo: `primary.DEFAULT`
- Ícono inactivo: `neutral.400`
- Label debajo del ícono, tamaño `text-xs`

**Bottom Sheet (modales mobile)**
- Fondo blanco, `rounded-t-2xl`
- Handle indicator arriba (barra gris corta centrada)
- Overlay con `bg-black/40`
- Animación: slide up desde abajo

**Balance summary card**
- Card destacada en la pantalla principal
- Fondo gradiente suave usando `primary.DEFAULT` → `primary.c`
- Texto blanco
- Montos grandes y legibles (`text-2xl font-bold`)

---

### Íconos
- Usar **Heroicons** (`@heroicons/vue`) — ya diseñados para Tailwind
- Tamaño estándar: `w-6 h-6` para navegación, `w-5 h-5` para inline
- No mezclar con otras librerías de íconos

---


---

## Testing

### Estrategia
- Tests unitarios para composables de lógica de negocio crítica — escribir junto con la implementación
- Tests de componentes y E2E — dejar para la fase final cuando la UI esté estable
- Framework: **Vitest** (ya incluido en el ecosistema Vite)

### Composables que requieren tests unitarios obligatorios

**`useDistribution.js`** — probar:
- Reparto correcto con porcentajes 40/30/30
- Reparto con costos fijos descontados
- Suma de distribución siempre igual a la base
- Caso con `isDistributable: false` (no repartir)
- Porcentajes que no suman 100% (debe lanzar error)

**`useImportExcel.js`** — probar:
- Parseo correcto del extracto BCR (filas de metadata ignoradas)
- Mapeo correcto de columnas a campos del modelo
- Detección de filas vacías al final (cuadro de resumen ignorado)
- Detección de duplicados por `reference` + `date`
- Archivo con formato incorrecto (debe retornar error claro)

**`useCurrency.js`** — probar:
- Formateo CRC con símbolo ₡ y locale es-CR
- Formateo USD con símbolo $
- Conversión CRC → USD con tipo de cambio dado
- Conversión USD → CRC con tipo de cambio dado

### Ubicación de los tests
```
src/
└── composables/
    └── __tests__/
        ├── useDistribution.test.js
        ├── useImportExcel.test.js
        └── useCurrency.test.js
```

### Configuración de Vitest
Agregar en `vite.config.js`:
```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

Comando para correr tests:
```bash
npm run test        # watch mode
npm run test:run    # single run
```

Agregar en `package.json`:
```json
"scripts": {
  "test": "vitest",
  "test:run": "vitest run"
}
```

### Regla para Claude Code
Cada vez que se implemente o modifique `useDistribution.js`, `useImportExcel.js` o `useCurrency.js`, escribir o actualizar sus tests correspondientes en `__tests__/`. No se considera completo un composable sin su test.

---
## Convenciones de código

- Nombres de archivos: `PascalCase` para componentes Vue, `camelCase` para servicios y composables
- Commits: `tipo/jvja.FL-##-descripcion-corta` (ej: `feat/jvja.FL-01-importar-excel`)
- No usar TypeScript — JSDoc cuando se necesite documentar tipos
- Comentarios en español
- Un componente = una responsabilidad

---

## Notas para Claude Code

- Siempre que crees un componente nuevo, verificar que sea usable en pantalla de 375px
- Los formularios deben tener validación básica antes de guardar en Firestore
- Toda operación de Firestore debe tener manejo de error con feedback visual al usuario
- El estado de carga (`loading`) debe mostrarse siempre que haya una operación async
- Usar `v-if` para loading states, nunca ocultar con CSS
- Cuando se implemente el importador, respetar exactamente el mapeo de columnas del BCR descrito arriba