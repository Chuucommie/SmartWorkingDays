# EOS Timesheet — Documentazione Tecnica

> **Guida per sviluppatori**  
> Versione: 3.0 — Giugno 2026  
> Repository: [github.com/Chuucommie/SmartWorkingDays](https://github.com/Chuucommie/SmartWorkingDays)

---

## 📋 Indice

1. [Architettura](#1-architettura)
2. [Struttura del progetto](#2-struttura-del-progetto)
3. [Moduli — descrizione dettagliata](#3-moduli--descrizione-dettagliata)
   - [3.1 Shared (condivisi)](#31-shared-condivisi)
   - [3.2 SmartWorking](#32-smartworking)
   - [3.3 Timesheet](#33-timesheet)
   - [3.4 Root](#34-root)
4. [Flusso dati](#4-flusso-dati)
5. [State management](#5-state-management)
6. [Testing](#6-testing)
7. [Configurazione integrazioni](#7-configurazione-integrazioni)
8. [Build e deploy](#8-build-e-deploy)
9. [Come estendere l'app](#9-come-estendere-lapp)

---

## 1. Architettura

```
┌─────────────────────────────────────────────────────────┐
│                    EOS Timesheet (SPA)                   │
│                                                          │
│  main.tsx → HashRouter → App.tsx (router principale)    │
│                                                          │
│  Routes:                                                 │
│  /              → Dashboard.tsx                          │
│  /smartworking  → modules/smartworking/SmartWorkingApp  │
│  /smartworking/team   → TeamViewPage.tsx                │
│  /smartworking/saved  → SavedWeeksPage.tsx              │
│  /timesheet     → modules/timesheet/TimesheetApp        │
│                                                          │
│  Moduli condivisi (shared/):                             │
│  config.ts | msAuth.ts | businessCentral.ts              │
│  outlookCalendar.ts | teamsNotify.ts                     │
│                                                          │
│  Moduli SmartWorking:                                    │
│  smartworking.ts (logica permutazioni)                   │
│  savedWeeks.ts (template localStorage)                   │
│  teamView.ts (vista team + coincidenze)                  │
│  teamWatcher.ts (polling notifiche)                      │
│  NotificationBell.tsx (UI campanella)                    │
└─────────────────────────────────────────────────────────┘
```

**Principi architetturali:**
- **Moduli puri** (`.ts`) separati dalla **UI** (`.tsx`) — logica testabile senza DOM
- **Stub pattern**: ogni integrazione esterna ha un modulo stub che usa mock data finché non vengono configurati i riferimenti reali
- **Configurazione centralizzata**: tutti i riferimenti agli ambienti in `config.ts`
- **HashRouter**: compatibile con GitHub Pages (no 404 su refresh)
- **TypeScript**: type safety su tutta la codebase, interfacce esplicite per ogni struttura dati

---

## 2. Struttura del progetto

```
SmartWorkingDays/
├── index.html                     # Entry point HTML
├── package.json                   # Dipendenze e script
├── tsconfig.json                  # Configurazione TypeScript
├── vite.config.js                 # Configurazione Vite + Vitest
├── README.md                      # Readme originale
├── DOCUMENTATION.md               # Documentazione funzionale (utente)
├── TECHNICAL.md                   # Questo file
├── INTEGRATION.md                 # Specifica integrazioni MS365
├── FEASIBILITY_ANALYSIS.md        # Analisi di fattibilità
├── SMARTWORKING_PLAN.md           # Piano modifiche
│
├── public/                        # Asset statici
│
├── dist/                          # Build output (generato)
│
└── src/
    ├── main.tsx                   # Entry point React
    ├── App.tsx                    # Router principale
    ├── Dashboard.tsx              # Dashboard EOS Timesheet
    ├── index.css                  # Stili globali (Tailwind + custom)
    │
    └── modules/
        ├── shared/                # Moduli condivisi tra tutti i moduli
        │   ├── config.ts          # Configurazione centralizzata + mock data
        │   ├── msAuth.ts          # Autenticazione Microsoft (stub)
        │   ├── businessCentral.ts # Client BC OData (stub)
        │   ├── outlookCalendar.ts # Client Outlook Graph (stub)
        │   ├── teamsNotify.ts     # Notifiche Teams webhook (stub)
        │   └── ThemeProvider.tsx   # Provider tema dark/light
        │
        ├── smartworking/          # Modulo Smart Working
        │   ├── smartworking.ts    # Logica pura: mappe SW, permutazioni
        │   ├── smartworking.test.ts # 51 test
        │   ├── SmartWorkingApp.tsx # UI principale pianificazione
        │   ├── savedWeeks.ts      # CRUD template localStorage
        │   ├── savedWeeks.test.ts # 27 test
        │   ├── SavedWeeksPage.tsx # UI gestione template
        │   ├── teamView.ts        # Vista team + coincidenze
        │   ├── teamView.test.ts   # 12 test
        │   ├── TeamViewPage.tsx   # UI vista team
        │   ├── teamWatcher.ts     # Polling notifiche cambi stato
        │   ├── teamWatcher.test.ts # 22 test
        │   └── NotificationBell.tsx # UI campanella notifiche
        │
        └── timesheet/             # Modulo Timesheet (placeholder)
            └── TimesheetApp.tsx   # UI "In sviluppo"
```

---

## 3. Moduli — descrizione dettagliata

### 3.1 Shared (condivisi)

#### `config.ts` — Configurazione centralizzata

**Esporta:**
| Nome | Tipo | Descrizione |
|---|---|---|
| `APP_CONFIG` | `AppConfig` | Configurazione completa dell'app (regola SW, Entra ID, BC, Graph, Teams, feature flags, limiti) |
| `isFeatureEnabled(name)` | `(string) => boolean` | Verifica se una feature è attiva |
| `getMockEmployeeData()` | `() => EmployeeData` | Dati mock dipendente corrente |
| `getMockTeamMembers()` | `() => EmployeeData[]` | Dati mock membri team (5 dipendenti) |
| `getMockTeamPlans(weekStart)` | `(string) => TeamPlan[]` | Dati mock pianificazioni SW |

**Tipi esportati:** `DayState`, `WeekPlan`, `EmployeeData`, `TeamPlan`, `AppConfig`

**Pattern:** Tutti i valori specifici dell'ambiente (client ID, tenant ID, company ID, webhook URL) sono placeholder. Per attivare un'integrazione reale, sostituire i placeholder con i valori reali e impostare il feature flag a `true`.

**Feature flags:**
```typescript
features: {
  smartWorking: true,        // Modulo SW (sempre attivo)
  teamView: true,            // Vista team
  teamNotifications: true,   // Notifiche polling
  savedWeeks: true,          // Template salvati
  timesheet: false,          // Timesheet (in sviluppo)
  outlookIntegration: false, // Integrazione Outlook
  teamsNotifications: false, // Notifiche canale Teams
  bcIntegration: false,      // Salvataggio su BC
}
```

#### `msAuth.ts` — Autenticazione Microsoft (stub)

**Esporta:**
| Nome | Descrizione |
|---|---|
| `initializeAuth()` | Inizializza auth. In mock: imposta utente autenticato con dati da config |
| `login()` | Avvia login interattivo |
| `logout()` | Effettua logout |
| `getAccessToken()` | Ottiene token di accesso |
| `getAuthState()` | Restituisce stato auth corrente |
| `getCurrentUserProfile()` | Profilo dipendente corrente |
| `getCurrentEmployeeId()` | ID dipendente corrente |
| `onAuthChange(listener)` | Registra callback per cambiamenti auth |

**Stato auth (interfaccia `AuthState`):**
```typescript
{
  isAuthenticated: boolean,
  account: { username: string, name: string } | null,
  accessToken: string | null,
  userProfile: EmployeeData | null,
}
```

**Mock mode:** Se `APP_CONFIG.entraId.clientId === 'YOUR_CLIENT_ID_HERE'`, usa automaticamente dati mock. Non serve configurare nulla per sviluppo.

**Production mode:** Quando `clientId` è configurato, userà MSAL.js per OAuth PKCE. Da implementare.

#### `businessCentral.ts` — Client BC OData (stub)

**Esporta:**
| Nome | Descrizione |
|---|---|
| `fetchTeamPlans(weekStart)` | Recupera tutte le pianificazioni SW della settimana |
| `fetchEmployeePlan(employeeId, weekStart)` | Recupera pianificazione di un singolo dipendente |
| `savePlanning(planning)` | Salva una pianificazione su BC |
| `fetchTimesheet(employeeId, weekStart)` | Recupera timesheet (placeholder) |
| `saveTimesheetEntry(entry)` | Salva entry timesheet (placeholder) |

**Mock mode:** Se `APP_CONFIG.features.bcIntegration === false`, restituisce dati da `getMockTeamPlans()` con latenza simulata (300-800ms).

**Production mode:** Usa axios per chiamate OData a BC. Endpoint:
- `GET /companies({id})/customTable_SWPlanning?$filter=...&$expand=employee`
- `POST /companies({id})/customTable_SWPlanning`

#### `outlookCalendar.ts` — Client Outlook Graph (stub)

**Esporta:**
| Nome | Descrizione |
|---|---|
| `fetchCalendarWeek(weekStart)` | Recupera eventi calendario della settimana |
| `mapEventsToDayStates(events)` | Mappa eventi → stati giorno (pura) |
| `createSWEvents(weekPlan, weekStart)` | Crea eventi "Smart Working" sul calendario |

**Regole di mapping eventi → stati:**
- `showAs === 'oof'` → `absent`
- Categoria "Ferie"/"Permesso" → `absent`
- Categoria "Smart Working" → `sw`
- `showAs === 'busy'` + location contiene "Ufficio"/"Sede" → `office`
- Nessun evento → `free`

#### `teamsNotify.ts` — Notifiche Teams (stub)

**Esporta:**
| Nome | Descrizione |
|---|---|
| `notifyChannel(message)` | Invia messaggio semplice al canale Teams |
| `notifyChannelCard(teamPlans, weekStart)` | Invia Adaptive Card riepilogativa |
| `buildWeeklySummaryCard(teamPlans, weekStart)` | Costruisce Adaptive Card JSON (pura) |

**Mock mode:** Se `APP_CONFIG.teams.webhookUrl` è vuoto o `teamsNotifications` è false, logga in console.

---

### 3.2 SmartWorking

#### `smartworking.ts` — Logica pura permutazioni

**Esporta:**
| Nome | Descrizione |
|---|---|
| `SW_DAYS_MAP` | Mappa giorni lavorati → giorni SW |
| `OFFICE_DAYS_MAP` | Mappa giorni lavorati → giorni Ufficio |
| `generateAllPermutations(dayStates, swTarget, officeTarget)` | Genera tutte le 2^k combinazioni |

**Algoritmo:** Bitmask loop su `k` giorni liberi. Per ogni combinazione, assegna `sw` (bit=1) o `office` (bit=0). Filtra con `floor/ceil` sui target.

**Test:** 51 test in `smartworking.test.ts` — copertura completa di mappe, permutazioni, validità, unicità, proprietà invarianti.

#### `savedWeeks.ts` — Template salvati (localStorage)

**Esporta:**
| Nome | Descrizione |
|---|---|
| `loadAll()` | Carica tutti i template |
| `save(name, days, swDaysRequested)` | Salva nuovo template |
| `remove(id)` | Elimina template |
| `rename(id, newName)` | Rinomina template |
| `exportAll()` | Esporta JSON |
| `importFromJSON(jsonString)` | Importa da JSON (merge) |
| `count()` | Numero template salvati |

**Storage:** `localStorage` chiave `sw-saved-weeks`. Max 20 template. Nomi case-insensitive unici.

**Test:** 27 test in `savedWeeks.test.ts` — validazione, limiti, duplicati, import/export, corruzione dati.

#### `teamView.ts` — Vista team e coincidenze

**Esporta:**
| Nome | Descrizione |
|---|---|
| `getTeamView(weekStart)` | Recupera e filtra pianificazioni team (async) |
| `computeOfficeOverlaps(myPlan, colleagues)` | Calcola coincidenze ufficio (pura) |
| `computeFullOverlapMatrix(myPlan, colleagues)` | Matrice coincidenze 5×N (pura) |
| `bcPlanToInternal(bcPlan)` | Converte formato BC → interno (pura) |

**Filtro team:** stesso `department` e stessa `locationCode` dell'utente corrente.

**Test:** 12 test in `teamView.test.ts` — overlaps, matrice, conversione BC.

#### `teamWatcher.ts` — Polling notifiche

**Esporta:**
| Nome | Descrizione |
|---|---|
| `createTeamWatcher(onNotification)` | Crea controller watcher |
| `hashWeek(week)` | Hash per confronto settimane (pura) |
| `diffWeeks(oldWeek, newWeek)` | Differenze giorno per giorno (pura) |
| `getCurrentWeekStart()` | Data inizio settimana corrente (pura) |

**Controller restituito (interfaccia `TeamWatcher`):**
```typescript
{
  start(): Promise<void>
  stop(): void
  getNotifications(): TeamNotification[]
  getUnreadCount(): number
  markRead(index: number): void
  markAllRead(): void
  clearAll(): void
  addWatched(employeeId: string): { success: boolean; error?: string }
  removeWatched(employeeId: string): { success: boolean; error?: string }
  getWatchedIds(): string[]
  isWatched(employeeId: string): boolean
}
```

**Polling:** ogni 5 minuti (`APP_CONFIG.polling.teamWatcherIntervalMs`). In pausa quando il tab non è visibile (Visibility API).

**Test:** 22 test in `teamWatcher.test.ts` — hash, diff, watch list CRUD, persistenza, notifiche.

#### `SmartWorkingApp.tsx` — UI pianificazione

Componente React principale del modulo SW. Contiene:
- Selettore giorni (5 pill button con 4 stati)
- Calcolo automatico target SW/Ufficio
- Generazione e visualizzazione permutazioni
- Toggle "mostra tutte" / "solo valide"
- Link navigazione a Team, Saved, Dashboard

**Stato:** `useState` per dayStates, selectedPerm, showAll. `useMemo` per permutazioni.

#### `TeamViewPage.tsx` — UI vista team

- Tabella con righe per ogni membro (te stesso + colleghi)
- Badge coincidenze 👥+N con tooltip
- Navigazione settimana (prec/succ)
- Checkbox "Segui" per attivare notifiche
- Gestione stati: loading, error, vuoto

#### `SavedWeeksPage.tsx` — UI template salvati

- Lista template con pallini colorati per giorni
- Azioni: Carica, Rinomina (doppio clic), Elimina
- Esporta JSON (download file)
- Importa JSON (upload file)
- Feedback con messaggi temporanei

#### `NotificationBell.tsx` — UI campanella notifiche

- Badge rosso con conteggio notifiche non lette
- Dropdown con elenco notifiche
- Marca come lette all'apertura
- Pulisci tutte
- Click outside per chiudere

---

### 3.3 Timesheet

#### `TimesheetApp.tsx` — Placeholder

Pagina "In sviluppo" con:
- Icona, titolo, descrizione
- Elenco funzionalità previste
- Link per tornare alla Dashboard

---

### 3.4 Root

#### `main.tsx` — Entry point

```tsx
<HashRouter>
  <ThemeProvider>
    <App />
  </ThemeProvider>
</HashRouter>
```

HashRouter per compatibilità GitHub Pages.

#### `App.tsx` — Router principale

```tsx
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/smartworking" element={<SmartWorkingApp />} />
  <Route path="/smartworking/team" element={<TeamViewPage />} />
  <Route path="/smartworking/saved" element={<SavedWeeksPage />} />
  <Route path="/timesheet" element={<TimesheetApp />} />
</Routes>
```

Navbar globale con link ai moduli attivi (basati su `isFeatureEnabled()`).

#### `Dashboard.tsx` — Dashboard

Card per ogni modulo con:
- Icona, titolo, descrizione
- Stato (attivo / in sviluppo)
- Link alla rotta del modulo
- Barra colorata laterale (accent color)

#### `index.css` — Stili globali

Framework: **Tailwind CSS 4** con tema personalizzato (colori Apple-style). Classi custom per:
- Navbar (glass effect, sticky)
- Dashboard (module cards, hero)
- Team view (tabella, badge coincidenze, watch button)
- Saved weeks (lista template, pallini, azioni)
- Notification bell (dropdown, badge, item)
- Smart working (day pills, perm rows, result pill)
- Placeholder page
- Responsive (max-width 480px)

---

## 4. Flusso dati

### Flusso attuale (mock mode)

```
1. App si avvia → main.tsx → HashRouter → App.tsx
2. Dashboard renderizzata (nessun dato esterno necessario)
3. Utente naviga a /smartworking
4. SmartWorkingApp.tsx:
   a. dayStates inizializzati come ['free','free','free','free','free']
   b. Utente clicca giorni → cycleState() aggiorna dayStates
   c. useMemo ricalcola permutazioni via generateAllPermutations()
   d. UI renderizza permutazioni
5. Utente naviga a /smartworking/team
6. TeamViewPage.tsx:
   a. getTeamView(weekStart) → fetchTeamPlans() → mock data da config
   b. computeOfficeOverlaps() calcola coincidenze
   c. UI renderizza tabella
7. Utente naviga a /smartworking/saved
8. SavedWeeksPage.tsx:
   a. loadAll() → localStorage
   b. UI renderizza lista template
```

### Flusso futuro (production mode con BC)

```
1. App si avvia → initializeAuth() → MSAL.js PKCE flow
2. Token Entra ID in memoria
3. Dashboard → uguale
4. SmartWorking:
   a. (opzionale) fetchCalendarWeek() → pre-compila giorni da Outlook
   b. (opzionale) fetchTimesheet() → pre-compila giorni da BC
   c. Utente pianifica
   d. savePlanning() → POST BC OData
   e. createSWEvents() → POST Graph calendar
   f. notifyChannel() → POST Teams webhook
5. Team view:
   a. fetchTeamPlans() → GET BC OData (reale)
   b. Filtro per department + locationCode
6. Notifiche:
   a. Polling ogni 5 min → fetchEmployeePlan() per ogni watched
   b. Diff detection → notifiche
```

---

## 5. State management

**Nessuna libreria di stato globale.** Ogni componente gestisce il proprio stato con `useState` + `useEffect`.

**Persistenza:**
| Dato | Storage | Chiave |
|---|---|---|
| Template salvati | `localStorage` | `sw-saved-weeks` |
| Watch list | `localStorage` | `sw-watched-members` |
| Tema | `localStorage` | `eos-theme` |
| Stato auth | Memoria (variabile) | — |
| Stato cache watcher | Memoria (Map) | — |
| Notifiche | Memoria (array) | — |
| Token Entra ID | Memoria (MSAL.js) | — |

**Comunicazione tra pagine:**
- **SmartWorkingApp → SavedWeeksPage**: `sessionStorage` (`sw-load-template`) per passare il template da caricare
- **TeamViewPage → NotificationBell**: entrambi usano `createTeamWatcher()` indipendentemente; NotificationBell ha il suo watcher

---

## 6. Testing

### Framework
- **Vitest** 4.x — compatibile con Vite, stesso ambiente
- **TypeScript** — test in `.test.ts` con type safety

### Script
```bash
npm test          # Esegue tutti i test una volta
npm run test:watch  # Watch mode per sviluppo
```

### Copertura attuale

| File test | Test | Copre |
|---|---|---|
| `smartworking.test.ts` | 51 | Mappe SW/Ufficio, `generateAllPermutations` (tutti i casi: 0-5 liberi, vincoli, target frazionari, unicità, invarianti) |
| `savedWeeks.test.ts` | 27 | `loadAll`, `save` (validazione, limiti, duplicati), `remove`, `rename`, `exportAll`, `importFromJSON` (merge, skip, errori), `count` |
| `teamView.test.ts` | 12 | `computeOfficeOverlaps` (null, no office, overlaps, vuoto), `computeFullOverlapMatrix`, `bcPlanToInternal` (conversione, default, null, fallback) |
| `teamWatcher.test.ts` | 22 | `hashWeek`, `diffWeeks`, `getCurrentWeekStart`, watch list CRUD, persistenza, notifiche |
| **Totale** | **112** | |

### Pattern di test
- **Funzioni pure**: testate direttamente con input/output
- **localStorage**: mockato con oggetto in-memory, resettato a ogni `beforeEach`
- **Moduli con dipendenze**: mockate con `vi.mock()` (es. `businessCentral.ts` in `teamWatcher.test.ts`)
- **Test UI**: non ancora implementati (richiedono jsdom o testing-library)

---

## 7. Configurazione integrazioni

Per attivare le integrazioni reali con Microsoft 365, modificare `src/modules/shared/config.ts`:

### Step 1: Entra ID (Azure AD)
```typescript
entraId: {
  clientId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',  // Da Azure Portal
  authority: 'https://login.microsoftonline.com/your-tenant-id',
  redirectUri: window.location.origin + '/SmartWorkingDays/',
  scopes: [ ... ],  // Scopes necessari
}
```

### Step 2: Business Central
```typescript
businessCentral: {
  baseUrl: 'https://api.businesscentral.dynamics.com/v2.0/your-tenant/your-environment',
  companyId: 'YOUR_COMPANY_ID',
  planningTableName: 'customTable_SWPlanning',
}
features: { bcIntegration: true }
```

### Step 3: Outlook
```typescript
features: { outlookIntegration: true }
```
Nessuna configurazione aggiuntiva — usa stesso token Entra ID.

### Step 4: Teams
```typescript
teams: {
  webhookUrl: 'https://eosprod.webhook.office.com/webhookb2/...',
}
features: { teamsNotifications: true }
```

### Step 5: Timesheet (quando sviluppato)
```typescript
features: { timesheet: true }
```

---

## 8. Build e deploy

### Build
```bash
npm run build     # Vite build → dist/
```

Output:
- `dist/index.html` (0.5 KB)
- `dist/assets/index-*.css` (33 KB)
- `dist/assets/index-*.js` (244 KB)

### Deploy
```bash
npm run deploy    # gh-pages -d dist → GitHub Pages
```

URL live: `https://Chuucommie.github.io/SmartWorkingDays/`

### HashRouter
L'app usa `HashRouter` invece di `BrowserRouter`. Questo significa che gli URL contengono `#`:
- `/#/` → Dashboard
- `/#/smartworking` → Smart Working
- `/#/smartworking/team` → Vista team

Questo è necessario perché GitHub Pages non supporta SPA routing (qualsiasi path diverso da `/` restituirebbe 404).

---

## 9. Come estendere l'app

### Aggiungere un nuovo modulo

1. Creare la cartella `src/modules/nuovo-modulo/`
2. Creare il componente React (`.tsx`)
3. Aggiungere la rotta in `App.tsx`:
   ```tsx
   <Route path="/nuovo-modulo" element={<NuovoModulo />} />
   ```
4. Aggiungere la card in `Dashboard.tsx`:
   ```typescript
   { title: 'Nuovo Modulo', icon: '🆕', path: '/nuovo-modulo', status: 'active', color: '#...' }
   ```
5. (Opzionale) Aggiungere link nella navbar di `App.tsx`
6. (Opzionale) Aggiungere feature flag in `config.ts`

### Aggiungere logica pura

1. Creare `src/modules/nuovo-modulo/logica.ts`
2. Esportare funzioni pure con type annotations
3. Creare `logica.test.ts` con Vitest
4. Importare nel componente React

### Attivare un'integrazione reale

1. Configurare i valori in `config.ts` (client ID, tenant, URL)
2. Impostare il feature flag a `true`
3. Implementare la logica di produzione nel modulo stub (es. `businessCentral.ts`)
4. Aggiungere test con mock HTTP (nock)

### Aggiungere test UI

```bash
npm install --save-dev @testing-library/react jsdom
```

Configurare `vite.config.js`:
```javascript
test: {
  environment: 'jsdom',
  include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
}
```

---

## Riepilogo tecnico

| Metrica | Valore |
|---|---|
| **Linguaggio** | TypeScript (`.ts` / `.tsx`) |
| **File sorgente** | 23 file |
| **Test** | 112 (4 file di test) |
| **Moduli puri** | 4 (smartworking, savedWeeks, teamView, teamWatcher) |
| **Componenti React** | 8 (App, Dashboard, SmartWorkingApp, TeamViewPage, SavedWeeksPage, NotificationBell, TimesheetApp, ThemeProvider) |
| **Stub integrazioni** | 4 (msAuth, businessCentral, outlookCalendar, teamsNotify) |
| **Dimensione build** | CSS 33 KB + JS 244 KB (gzip: 7 KB + 77 KB) |
| **Dipendenze npm** | react, react-dom, react-router-dom, typescript, tailwindcss, vite, vitest, gh-pages |

---

*Documento generato da IgelDev — 20 giugno 2026*
