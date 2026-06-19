# SmartWorkingDays — Analisi di fattibilità tecnica

> **Documento di analisi approfondita**  
> Versione: 1.0 — Giugno 2026  
> Stato: **Analisi completata — tutte le richieste sono fattibili**  
> Metodologia: analisi per criterio (tecnico, dipendenze, rischi, effort)

---

## 📋 Indice

1. [Metodologia di analisi](#metodologia-di-analisi)
2. [Feature 1: Combinazioni settimanali salvate](#feature-1-combinazioni-settimanali-salvate)
3. [Feature 2: Consultazione team](#feature-2-consultazione-team)
4. [Feature 3: Coincidenze in ufficio](#feature-3-coincidenze-in-ufficio)
5. [Feature 4: Notifiche cambi stato](#feature-4-notifiche-cambi-stato)
6. [Feature 5: Integrazione EOS Timesheet](#feature-5-integrazione-eos-timesheet)
7. [Matrice di fattibilità riepilogativa](#matrice-di-fattibilità-riepilogativa)
8. [Rischi trasversali e mitigazioni](#rischi-trasversali-e-mitigazioni)

---

## Metodologia di analisi

Ogni feature è valutata su 5 criteri:

| Criterio | Scala | Significato |
|---|---|---|
| **Fattibilità tecnica** | ALTA / MEDIA / BASSA / IMPOSSIBILE | Si può fare con le tecnologie disponibili? |
| **Complessità implementativa** | Bassa / Media / Alta | Quanto codice nuovo serve? Quanta logica complessa? |
| **Dipendenze esterne** | Nessuna / BC / Graph / BC+Graph | Cosa deve esistere fuori dall'app perché funzioni? |
| **Rischio tecnico** | Nessuno / Basso / Medio / Alto | Cosa può andare storto? Bloccanti? |
| **Effort stimato** | Giorni-uomo | Tempo di sviluppo inclusi test |

---

## Feature 1: Combinazioni settimanali salvate

### Richiesta
> L'utente può salvare una configurazione settimanale come template e richiamarla in futuro.

### Analisi

| Criterio | Valutazione |
|---|---|
| Fattibilità tecnica | ✅ **ALTA** |
| Complessità | **Bassa** |
| Dipendenze esterne | **Nessuna** |
| Rischio tecnico | **Nessuno** |
| Effort | **1-2 giorni** |

### Come implementare

#### Stack
- **Storage:** `localStorage` del browser (nessun backend, nessuna API)
- **Librerie:** nessuna aggiuntiva (JavaScript vanilla + React state)
- **Test:** Vitest (già installato)

#### Struttura dati

```javascript
// Chiave localStorage: 'sw-saved-weeks'
// Valore: array JSON di oggetti template
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",  // crypto.randomUUID()
    "name": "Settimana tipo standard",
    "days": ["sw", "sw", "office", "sw", "sw"],      // 5 elementi
    "swDaysRequested": 3,                              // quanti SW l'utente voleva
    "createdAt": "2026-06-19T10:00:00.000Z",          // ISO 8601
    "updatedAt": "2026-06-19T10:00:00.000Z"
  }
]
```

#### API del modulo `savedWeeks.js`

```javascript
// Tutte funzioni pure (testabili senza DOM)

/**
 * Carica tutti i template salvati.
 * @returns {Array} Array di template, vuoto se nessuno
 */
export function loadAll() {
  const raw = localStorage.getItem('sw-saved-weeks')
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Dati corrotti → reset silenzioso
    localStorage.removeItem('sw-saved-weeks')
    return []
  }
}

/**
 * Salva un nuovo template.
 * @param {string} name - Nome descrittivo
 * @param {string[]} days - Array di 5 stati
 * @param {number} swDaysRequested - Giorni SW desiderati
 * @returns {{ success: boolean, error?: string, template?: object }}
 */
export function save(name, days, swDaysRequested) {
  const all = loadAll()

  // Validazione
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Il nome è obbligatorio' }
  }
  if (name.length > 50) {
    return { success: false, error: 'Nome troppo lungo (max 50 caratteri)' }
  }
  if (!Array.isArray(days) || days.length !== 5) {
    return { success: false, error: 'Configurazione non valida' }
  }
  if (all.length >= 20) {
    return { success: false, error: 'Limite di 20 template raggiunto' }
  }
  // Nome duplicato?
  if (all.some(t => t.name.toLowerCase() === name.trim().toLowerCase())) {
    return { success: false, error: 'Esiste già un template con questo nome' }
  }

  const template = {
    id: crypto.randomUUID(),
    name: name.trim(),
    days,
    swDaysRequested,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  all.push(template)
  localStorage.setItem('sw-saved-weeks', JSON.stringify(all))
  return { success: true, template }
}

/**
 * Elimina un template per ID.
 */
export function remove(id) {
  const all = loadAll()
  const filtered = all.filter(t => t.id !== id)
  if (filtered.length === all.length) {
    return { success: false, error: 'Template non trovato' }
  }
  localStorage.setItem('sw-saved-weeks', JSON.stringify(filtered))
  return { success: true }
}

/**
 * Rinomina un template.
 */
export function rename(id, newName) {
  if (!newName || newName.trim().length === 0) {
    return { success: false, error: 'Il nome è obbligatorio' }
  }
  const all = loadAll()
  const template = all.find(t => t.id === id)
  if (!template) {
    return { success: false, error: 'Template non trovato' }
  }
  template.name = newName.trim()
  template.updatedAt = new Date().toISOString()
  localStorage.setItem('sw-saved-weeks', JSON.stringify(all))
  return { success: true, template }
}

/**
 * Esporta tutti i template come JSON (per backup).
 */
export function exportAll() {
  return JSON.stringify(loadAll(), null, 2)
}

/**
 * Importa template da JSON (merge con esistenti, skip duplicati per nome).
 */
export function importFromJSON(jsonString) {
  try {
    const incoming = JSON.parse(jsonString)
    if (!Array.isArray(incoming)) {
      return { success: false, error: 'Formato non valido: array atteso' }
    }
    const all = loadAll()
    let added = 0
    for (const t of incoming) {
      if (all.length >= 20) break
      if (!t.name || !Array.isArray(t.days) || t.days.length !== 5) continue
      if (all.some(existing => existing.name.toLowerCase() === t.name.toLowerCase())) continue
      all.push({
        ...t,
        id: t.id || crypto.randomUUID(),
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      added++
    }
    localStorage.setItem('sw-saved-weeks', JSON.stringify(all))
    return { success: true, added, total: all.length }
  } catch {
    return { success: false, error: 'JSON non valido' }
  }
}
```

#### Test previsti (~15 test)

```
savedWeeks.test.js
├── loadAll()
│   ├── ritorna [] se localStorage vuoto
│   ├── ritorna array se dati validi
│   └── ritorna [] e pulisce se dati corrotti
├── save()
│   ├── salva template valido
│   ├── rifiuta nome vuoto
│   ├── rifiuta nome > 50 caratteri
│   ├── rifiuta days non valido (non array, length != 5)
│   ├── rifiuta se limite 20 raggiunto
│   └── rifiuta nome duplicato (case-insensitive)
├── remove()
│   ├── elimina template esistente
│   └── errore se ID non trovato
├── rename()
│   ├── rinomina con successo
│   └── errore se nome vuoto o ID non trovato
├── exportAll() → JSON.stringify corretto
└── importFromJSON()
    ├── importa array valido (merge)
    ├── skip duplicati per nome
    └── errore su JSON malformato
```

#### UI prevista

**Dropdown "Carica combinazione"** nella SmartWorkingApp:
```jsx
<select onChange={(e) => loadTemplate(e.target.value)}>
  <option value="">-- Carica combinazione salvata --</option>
  {templates.map(t => (
    <option key={t.id} value={t.id}>{t.name} ({t.swDaysRequested} SW)</option>
  ))}
</select>
```

**Pulsante "Salva questa settimana"** → modale:
```
┌──────────────────────────────────┐
│  Salva combinazione              │
│                                  │
│  Nome: [______________________]  │
│                                  │
│  Configurazione:                 │
│  🏠 Lun  🏢 Mar  🏢 Mer  🏠 Gio  🏠 Ven │
│  3 giorni SW richiesti           │
│                                  │
│  [Annulla]  [Salva]              │
└──────────────────────────────────┘
```

**Pagina `/smartworking/saved`** — gestione template:
- Lista template con nome, anteprima giorni (5 pallini colorati), data creazione
- Pulsanti: Carica | Rinomina | Elimina
- Pulsante "Esporta tutti" → download JSON
- Pulsante "Importa" → upload file JSON

#### Limiti e vincoli
- **Max 20 template** — limite arbitrario per non saturare localStorage (5MB per dominio)
- **Nomi unici** (case-insensitive) — per evitare confusione nell'utente
- **Nessuna sincronizzazione cross-device** — i template sono locali al browser
- **Backup via export/import JSON** — l'utente può trasferirli manualmente

---

## Feature 2: Consultazione team

### Richiesta
> I membri del team possono vedere la pianificazione SW degli altri membri (stesso dipartimento, stessa sede).

### Analisi

| Criterio | Valutazione |
|---|---|
| Fattibilità tecnica | ✅ **MEDIA** |
| Complessità | **Media** |
| Dipendenze esterne | **Business Central** (tabella `SW Planning` popolata) |
| Rischio tecnico | **Basso** |
| Effort | **3-5 giorni** |

### Come implementare

#### Stack
- **Fonte dati:** Business Central OData API
- **Auth:** MSAL.js (PKCE flow, token Entra ID)
- **Client HTTP:** axios (o `fetch` nativo)
- **Test:** Vitest + nock (mock HTTP)

#### Flusso dati

```
1. Utente autenticato (token Entra ID in memoria)
2. App determina employeeId, department, locationCode dell'utente
   → GET BC /companies({id})/employees({employeeId})
3. App recupera tutte le pianificazioni per la settimana corrente
   → GET BC /companies({id})/customTable_SWPlanning?
        $filter=weekStart eq '{monday}'&
        $expand=employee
4. Lato client: filtra per department e locationCode uguali all'utente
5. UI: renderizza tabella team
```

#### Endpoint BC necessari

| Endpoint | Scopo |
|---|---|
| `GET /companies({id})/employees({employeeId})` | Ottenere department e locationCode dell'utente |
| `GET /companies({id})/customTable_SWPlanning?$filter=weekStart eq '{date}'&$expand=employee` | Tutte le pianificazioni della settimana |

**Nota:** `$expand=employee` è fondamentale — permette di ottenere nome, dipartimento e sede del dipendente in una singola chiamata, senza N+1 query.

#### Struttura risposta BC (esempio)

```json
{
  "value": [
    {
      "entryNo": 1,
      "employeeNo": "EMP001",
      "weekStart": "2026-06-22",
      "monday": "SmartWorking",
      "tuesday": "Office",
      "wednesday": "Office",
      "thursday": "SmartWorking",
      "friday": "SmartWorking",
      "swDaysRequested": 3,
      "employee": {
        "no": "EMP001",
        "firstName": "Ricardo",
        "lastName": "Quintero",
        "department": "IT",
        "locationCode": "MILANO"
      }
    }
    // ... altre pianificazioni
  ]
}
```

#### API del modulo `teamView.js`

```javascript
import { fetchTeamPlans } from '../shared/businessCentral.js'

/**
 * Recupera e filtra le pianificazioni del team.
 * @param {string} weekStart - Data inizio settimana ISO (YYYY-MM-DD)
 * @param {string} myEmployeeId - ID dipendente corrente
 * @param {string} myDepartment - Dipartimento corrente
 * @param {string} myLocation - Sede corrente
 * @returns {Promise<{ myPlan: object|null, colleagues: object[] }>}
 */
export async function getTeamView(weekStart, myEmployeeId, myDepartment, myLocation) {
  const allPlans = await fetchTeamPlans(weekStart)

  // Filtra: stesso dipartimento E stessa sede
  const teamPlans = allPlans.filter(p =>
    p.employee.department === myDepartment &&
    p.employee.locationCode === myLocation
  )

  // Separa il piano dell'utente da quello dei colleghi
  const myPlan = teamPlans.find(p => p.employeeNo === myEmployeeId) || null
  const colleagues = teamPlans.filter(p => p.employeeNo !== myEmployeeId)

  return { myPlan, colleagues }
}

/**
 * Converte una pianificazione BC nel formato interno dell'app.
 */
export function bcPlanToInternal(bcPlan) {
  if (!bcPlan) return null
  const dayTypeMap = {
    'Free': 'free',
    'SmartWorking': 'sw',
    'Office': 'office',
    'Absent': 'absent',
  }
  return {
    employeeId: bcPlan.employeeNo,
    employeeName: `${bcPlan.employee.firstName} ${bcPlan.employee.lastName}`,
    department: bcPlan.employee.department,
    location: bcPlan.employee.locationCode,
    week: [
      dayTypeMap[bcPlan.monday] || 'free',
      dayTypeMap[bcPlan.tuesday] || 'free',
      dayTypeMap[bcPlan.wednesday] || 'free',
      dayTypeMap[bcPlan.thursday] || 'free',
      dayTypeMap[bcPlan.friday] || 'free',
    ],
    swDaysRequested: bcPlan.swDaysRequested || 0,
  }
}
```

#### Test previsti (~20 test)

```
teamView.test.js
├── getTeamView()
│   ├── recupera piani e filtra per department + location
│   ├── separa myPlan da colleagues
│   ├── myPlan = null se utente non ha ancora pianificato
│   ├── colleagues = [] se nessun altro ha pianificato
│   └── gestisce errore API (reject, non crash)
├── bcPlanToInternal()
│   ├── converte tutti i day type correttamente
│   ├── giorno non mappato → 'free' (default sicuro)
│   ├── ritorna null se input null
│   └── costruisce employeeName da firstName + lastName
└── fetchTeamPlans() (in businessCentral.test.js)
    ├── chiama endpoint corretto con $expand
    ├── gestisce risposta vuota (nessuna pianificazione)
    └── gestisce errore di rete
```

#### UI prevista — Pagina `/smartworking/team`

```
┌──────────────────────────────────────────────────────────┐
│  Il mio team — Settimana 23/06                           │
│  Dipartimento: IT · Sede: MILANO                         │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Nome          │ Lun │ Mar │ Mer │ Gio │ Ven │ SW │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ Ricardo Q. 👤 │ 🏠  │ 🏢  │ 🏢  │ 🏠  │ 🏠  │ 3  │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ Mario Rossi   │ 🏢  │ 🏢  │ 🏢  │ 🏠  │ 🏠  │ 2  │  │
│  │               │     │ 👥+1│ 👥+1│     │     │    │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ Anna Bianchi  │ 🏠  │ 🏠  │ 🏢  │ 🏢  │ 🏢  │ 2  │  │
│  │               │     │     │ 👥+1│     │     │    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  👤 = tu    👥+N = coincidi con N colleghi in ufficio    │
│                                                          │
│  [🔄 Aggiorna]  [📅 Settimana prec.]  [📅 Settimana succ.]│
└──────────────────────────────────────────────────────────┘
```

#### Gestione stato vuoto

Se nessun collega ha ancora pianificato:
```
┌──────────────────────────────────────────┐
│  😶 Nessun collega ha ancora pianificato │
│  questa settimana.                       │
│                                          │
│  Condividi l'app con il tuo team!        │
└──────────────────────────────────────────┘
```

Se l'utente non ha ancora pianificato:
- Riga "Tu" mostra "— Non hai ancora pianificato —" con link per farlo

#### Performance
- **1 chiamata API** per tutta la vista team (grazie a `$expand`)
- **Filtro lato client** (istantaneo, < 100 dipendenti per dipartimento)
- **Cache in memoria** (1 minuto) per evitare richieste duplicate durante la navigazione

---

## Feature 3: Coincidenze in ufficio

### Richiesta
> Per membri stessa sede e stesso team, evidenziare i giorni in cui si coincide in ufficio.

### Analisi

| Criterio | Valutazione |
|---|---|
| Fattibilità tecnica | ✅ **ALTA** |
| Complessità | **Bassa** |
| Dipendenze esterne | **Nessuna** (logica pura sui dati già fetchati) |
| Rischio tecnico | **Nessuno** |
| Effort | **1-2 giorni** (dopo Feature 2) |

### Come implementare

#### Algoritmo (funzione pura)

```javascript
/**
 * Calcola per ogni giorno della settimana quali colleghi
 * sono in ufficio insieme all'utente.
 *
 * @param {object} myPlan - Piano dell'utente { week: string[5] }
 * @param {object[]} colleagues - Piani dei colleghi [{ employeeName, week }]
 * @returns {object} Mappa giorno → array nomi colleghi
 *   es. { 1: ['Mario Rossi'], 2: ['Mario Rossi', 'Anna Bianchi'] }
 */
export function computeOfficeOverlaps(myPlan, colleagues) {
  const overlaps = {}

  for (let day = 0; day < 5; day++) {
    // Se l'utente non è in ufficio quel giorno, nessuna coincidenza
    if (!myPlan || myPlan.week[day] !== 'office') continue

    const inOffice = colleagues
      .filter(c => c.week[day] === 'office')
      .map(c => c.employeeName)

    if (inOffice.length > 0) {
      overlaps[day] = inOffice
    }
  }

  return overlaps
}

/**
 * Versione estesa: calcola TUTTE le coincidenze tra TUTTI i membri.
 * Restituisce una matrice giorni × giorni per heatmap.
 *
 * @returns {object[][]} Matrice 5×N dove N = numero colleghi
 *   matrice[day][colleagueIndex] = true se coincidono
 */
export function computeFullOverlapMatrix(myPlan, colleagues) {
  const matrix = []
  for (let day = 0; day < 5; day++) {
    matrix[day] = colleagues.map(c =>
      myPlan && myPlan.week[day] === 'office' && c.week[day] === 'office'
    )
  }
  return matrix
}
```

#### Complessità computazionale
- **O(d × c)** dove d = 5 (giorni), c = numero colleghi (max ~100)
- **Massimo 500 operazioni** — istantaneo
- Nessun problema di performance

#### Test previsti (~8 test)

```
teamView.test.js (aggiunte a test esistenti)
├── computeOfficeOverlaps()
│   ├── ritorna {} se myPlan è null
│   ├── ritorna {} se myPlan non ha giorni 'office'
│   ├── ritorna overlaps corretti per giorni office
│   ├── non include l'utente stesso nei colleghi
│   └── gestisce colleagues = []
└── computeFullOverlapMatrix()
    ├── matrice 5×N corretta
    ├── tutti false se myPlan null
    └── tutti false se nessuna coincidenza
```

#### UI — Integrazione nella vista team

**Badge sulle celle della tabella:**
```jsx
// Nella riga dell'utente (Ricardo), colonna Mar:
{overlaps[1] && (
  <span className="overlap-badge" title={overlaps[1].join(', ')}>
    👥 +{overlaps[1].length}
  </span>
)}
```

**Tooltip al hover:**
```
┌─────────────────────┐
│ In ufficio con te:  │
│ • Mario Rossi       │
│ • Anna Bianchi      │
└─────────────────────┘
```

**Vista "Calendario coincidenze" (opzionale, route `/smartworking/team/overlaps`):**
```
┌──────────────────────────────────────────────────────┐
│  Coincidenze in ufficio — Settimana 23/06             │
│                                                       │
│           │ Lun │ Mar │ Mer │ Gio │ Ven │             │
│  ────────────────────────────────────────             │
│  Ricardo  │  —  │ 🟢  │ 🟢  │  —  │  —  │             │
│  Mario    │  —  │ 🟢  │ 🟢  │  —  │  —  │             │
│  Anna     │  —  │  —  │ 🟢  │  —  │  —  │             │
│                                                       │
│  🟢 = giorno con coincidenze in ufficio               │
│  3 giorni su 5 con almeno un collega in sede          │
└──────────────────────────────────────────────────────┘
```

---

## Feature 4: Notifiche cambi stato

### Richiesta
> L'utente seleziona membri specifici del team da "seguire" e riceve notifiche quando cambiano la loro pianificazione SW.

### Analisi

| Criterio | Valutazione |
|---|---|
| Fattibilità tecnica | ✅ **MEDIA-ALTA** |
| Complessità | **Media** |
| Dipendenze esterne | **Business Central** (tabella `SW Planning` popolata) |
| Rischio tecnico | **Medio** (rate limit BC, polling overhead) |
| Effort | **3-4 giorni** |

### Come implementare

#### Approccio scelto: Polling locale

**Perché polling e non webhook:**
- Nessun backend server richiesto
- BC non supporta webhook nativi per tabelle custom
- Teams incoming webhook è solo output, non input
- Polling ogni 5 minuti è accettabile per notifiche non critiche

**Alternative scartate:**
- Webhook BC → richiede Azure Function o backend server (complessità 10×)
- SignalR / WebSocket → richiede backend server
- Graph change notifications → richiede backend server + subscription management

#### Architettura del polling

```
┌─────────────────────────────────────────────────────┐
│                  teamWatcher.js                       │
│                                                      │
│  ┌──────────────┐    ┌──────────────┐                │
│  │ Watch List   │    │ State Cache  │                │
│  │ (localStorage│    │ (in memoria) │                │
│  │  persistente)│    │              │                │
│  └──────┬───────┘    └──────┬───────┘                │
│         │                   │                        │
│         └────────┬──────────┘                        │
│                  │                                   │
│                  ▼                                   │
│  ┌──────────────────────────────┐                    │
│  │ Polling Engine               │                    │
│  │ • setInterval(5 min)         │                    │
│  │ • Visibility API (pausa)     │                    │
│  │ • GET BC OData (solo watched)│                    │
│  └──────────────┬───────────────┘                    │
│                 │                                    │
│                 ▼                                    │
│  ┌──────────────────────────────┐                    │
│  │ Diff Detector                │                    │
│  │ • Confronta hash stati       │                    │
│  │ • Genera notifiche           │                    │
│  └──────────────┬───────────────┘                    │
│                 │                                    │
│                 ▼                                    │
│  ┌──────────────────────────────┐                    │
│  │ Notification Store           │                    │
│  │ (in memoria, non persistente)│                    │
│  └──────────────────────────────┘                    │
└─────────────────────────────────────────────────────┘
```

#### Struttura dati

```javascript
// localStorage: 'sw-watched-members'
// Array di employeeId seguiti
["EMP002", "EMP003"]

// In memoria (ricostruito a ogni apertura app):
// Map<employeeId, { week, hash }>
const lastKnownState = new Map()
// Esempio:
// "EMP002" → { week: ["sw","sw","office","sw","sw"], hash: "abc123" }

// In memoria (volatile, si resetta a ogni apertura):
// Array di notifiche
const notifications = []
// Esempio:
// {
//   employeeId: "EMP002",
//   employeeName: "Mario Rossi",
//   timestamp: "2026-06-19T14:30:00Z",
//   changes: [
//     { day: 0, label: "Lun", from: "sw", to: "office" },
//     { day: 3, label: "Gio", from: "office", to: "sw" }
//   ],
//   read: false
// }
```

#### API del modulo `teamWatcher.js`

```javascript
/**
 * Inizializza il watcher: carica watch list, fa primo fetch, avvia polling.
 * @param {function} onNotification - Callback quando arriva una notifica
 * @returns {{ start, stop, getNotifications, markRead, clearAll }}
 */
export function createTeamWatcher(onNotification) {
  let timer = null
  let watchedIds = loadWatchedMembers()
  const stateCache = new Map()
  const notifications = []

  // Carica stato iniziale
  async function initialize() {
    for (const id of watchedIds) {
      const plan = await fetchEmployeePlan(id, getCurrentWeekStart())
      if (plan) {
        stateCache.set(id, {
          week: plan.week,
          hash: hashWeek(plan.week),
        })
      }
    }
  }

  // Polling
  async function poll() {
    for (const id of watchedIds) {
      const plan = await fetchEmployeePlan(id, getCurrentWeekStart())
      if (!plan) continue

      const newHash = hashWeek(plan.week)
      const cached = stateCache.get(id)

      if (cached && cached.hash !== newHash) {
        // Cambiamento rilevato!
        const changes = diffWeeks(cached.week, plan.week)
        const notification = {
          employeeId: id,
          employeeName: plan.employeeName,
          timestamp: new Date().toISOString(),
          changes,
          read: false,
        }
        notifications.unshift(notification)
        onNotification(notification)
      }

      // Aggiorna cache
      stateCache.set(id, { week: plan.week, hash: newHash })
    }
  }

  function start() {
    initialize().then(() => {
      timer = setInterval(poll, 5 * 60 * 1000) // 5 minuti
      // Pausa quando tab non visibile
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          clearInterval(timer)
          timer = null
        } else {
          poll() // fetch immediato al ritorno
          timer = setInterval(poll, 5 * 60 * 1000)
        }
      })
    })
  }

  function stop() {
    if (timer) clearInterval(timer)
    timer = null
  }

  return {
    start,
    stop,
    getNotifications: () => [...notifications],
    getUnreadCount: () => notifications.filter(n => !n.read).length,
    markRead: (index) => { if (notifications[index]) notifications[index].read = true },
    clearAll: () => { notifications.length = 0 },
    addWatched: (employeeId) => { /* aggiungi a localStorage + cache */ },
    removeWatched: (employeeId) => { /* rimuovi da localStorage + cache */ },
    getWatchedIds: () => [...watchedIds],
  }
}

// Funzioni pure helper

/** Hash semplice per confrontare settimane */
function hashWeek(week) {
  return week.join('|') // "sw|office|office|sw|sw"
}

/** Calcola differenze giorno per giorno */
function diffWeeks(oldWeek, newWeek) {
  const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven']
  const changes = []
  for (let i = 0; i < 5; i++) {
    if (oldWeek[i] !== newWeek[i]) {
      changes.push({ day: i, label: DAY_LABELS[i], from: oldWeek[i], to: newWeek[i] })
    }
  }
  return changes
}

/** Carica watch list da localStorage */
function loadWatchedMembers() {
  const raw = localStorage.getItem('sw-watched-members')
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}
```

#### Gestione rate limit BC

```javascript
// Rate limiter semplice per BC OData
const rateLimiter = {
  lastCall: 0,
  minInterval: 1000, // 1 secondo tra chiamate (conservativo)

  async throttle(fn) {
    const now = Date.now()
    const wait = Math.max(0, this.minInterval - (now - this.lastCall))
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    this.lastCall = Date.now()
    return fn()
  }
}
```

**Calcolo consumo API:**
- 10 membri seguiti × 1 richiesta ogni 5 min = 2 richieste/min = 120/ora
- BC non ha rate limit documentati pubblicamente
- 120 richieste/ora è ampiamente sicuro
- Con 50 membri: 600/ora — ancora accettabile

#### Test previsti (~15 test)

```
teamWatcher.test.js
├── hashWeek()
│   ├── produce hash deterministico
│   └── hash diversi per settimane diverse
├── diffWeeks()
│   ├── rileva 1 cambiamento
│   ├── rileva cambiamenti multipli
│   ├── ritorna [] se nessun cambiamento
│   └── include label giorno corretto
├── loadWatchedMembers()
│   ├── carica da localStorage
│   ├── ritorna [] se vuoto
│   └── ritorna [] se dati corrotti
├── addWatched / removeWatched
│   ├── aggiunge ID alla lista
│   ├── rimuove ID dalla lista
│   └── persiste in localStorage
├── createTeamWatcher()
│   ├── start avvia polling
│   ├── stop ferma polling
│   ├── onNotification chiamato al cambiamento
│   ├── getUnreadCount corretto
│   └── markRead aggiorna stato
└── Visibility API
    ├── polling in pausa quando tab nascosto
    └── polling riprende quando tab visibile
```

#### UI prevista

**Checkbox "Segui" nella vista team:**
```jsx
// In ogni riga della tabella team (tranne la propria)
<td>
  <input
    type="checkbox"
    checked={isWatched(colleague.employeeId)}
    onChange={() => toggleWatch(colleague.employeeId)}
  />
  <label>Segui</label>
</td>
```

**Badge notifiche nell'header dell'app:**
```jsx
// Componente NotificationBell
<span className="notification-bell" onClick={toggleDropdown}>
  🔔
  {unreadCount > 0 && (
    <span className="badge">{unreadCount}</span>
  )}
</span>
```

**Dropdown notifiche:**
```
┌──────────────────────────────────────────────┐
│  🔔 Notifiche                        [Pulisci]│
│                                               │
│  🟡 5 min fa                                  │
│  Mario Rossi ha modificato la pianificazione: │
│  Lun: SW → Ufficio                            │
│  Gio: Ufficio → SW                            │
│  [Vedi pianificazione]                        │
│                                               │
│  ⚪ 2 ore fa                                   │
│  Anna Bianchi ha modificato la pianificazione:│
│  Mer: Ufficio → SW                            │
│  [Vedi pianificazione]                        │
└──────────────────────────────────────────────┘
```

**Toast all'apertura app:**
```
┌──────────────────────────────────────────┐
│  🔔 2 membri del team hanno modificato   │
│  la loro pianificazione mentre eri via.  │
│                                          │
│  [Vedi notifiche]                        │
└──────────────────────────────────────────┘
```

#### Limitazioni note
- **Notifiche solo quando l'app è aperta** — nessun push notification (richiederebbe service worker + backend)
- **Ritardo max 5 minuti** — accettabile per pianificazioni settimanali (non critiche al minuto)
- **Nessuna notifica cross-device** — le notifiche sono locali al browser
- **Watch list locale** — non sincronizzata tra dispositivi

---

## Feature 5: Integrazione EOS Timesheet

### Richiesta
> SmartWorkingDays come modulo di un'app più ampia "EOS Timesheet" che permette di scrivere ore su Business Central di EOS Prod.

### Analisi

| Criterio | Valutazione |
|---|---|
| Fattibilità tecnica | ✅ **ALTA** |
| Complessità | **Media** |
| Dipendenze esterne | **Nessuna** (refactor interno) |
| Rischio tecnico | **Basso** |
| Effort | **2-3 giorni** |

### Come implementare

#### Strategia di refactor

**Principio chiave: non rompere nulla.** Il refactor è incrementale:
1. Spostare i file esistenti nella nuova struttura
2. Verificare che build e test passino
3. Aggiungere React Router
4. Verificare che l'app funzioni come prima
5. Aggiungere nuovi moduli

#### Step 1: Nuova struttura cartelle

```
Prima:
src/
├── App.jsx
├── App.css → index.css
├── smartworking.js
├── smartworking.test.js
└── main.jsx

Dopo:
src/
├── modules/
│   ├── smartworking/
│   │   ├── SmartWorkingApp.jsx    (ex App.jsx)
│   │   ├── SmartWorking.css       (stili specifici SW)
│   │   ├── smartworking.js        (invariato)
│   │   └── smartworking.test.js   (invariato)
│   │
│   ├── timesheet/                 (placeholder)
│   │   └── TimesheetApp.jsx       (componente "In sviluppo")
│   │
│   └── shared/
│       ├── config.js
│       └── (msAuth, businessCentral, etc. — futuri)
│
├── App.jsx                        (router principale)
├── Dashboard.jsx                  (dashboard EOS Timesheet)
├── index.css                      (stili globali)
└── main.jsx                       (invariato)
```

#### Step 2: React Router

```bash
npm install react-router-dom
```

```jsx
// src/main.jsx — entry point (modifica minima)
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename="/SmartWorkingDays">
    <App />
  </BrowserRouter>
)
```

```jsx
// src/App.jsx — router principale
import { Routes, Route, Link } from 'react-router-dom'
import Dashboard from './Dashboard.jsx'
import SmartWorkingApp from './modules/smartworking/SmartWorkingApp.jsx'
import TeamViewPage from './modules/smartworking/TeamViewPage.jsx'
import SavedWeeksPage from './modules/smartworking/SavedWeeksPage.jsx'
import TimesheetApp from './modules/timesheet/TimesheetApp.jsx'

export default function App() {
  return (
    <div className="app-shell">
      {/* Navbar globale (opzionale) */}
      <nav className="global-nav">
        <Link to="/">Dashboard</Link>
        <Link to="/smartworking">Smart Working</Link>
        <Link to="/timesheet">Timesheet</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/smartworking" element={<SmartWorkingApp />} />
        <Route path="/smartworking/team" element={<TeamViewPage />} />
        <Route path="/smartworking/saved" element={<SavedWeeksPage />} />
        <Route path="/timesheet" element={<TimesheetApp />} />
      </Routes>
    </div>
  )
}
```

#### Step 3: Adattare SmartWorkingApp

```jsx
// src/modules/smartworking/SmartWorkingApp.jsx
// Ex App.jsx — modifiche minime:
// 1. Importa stili da './SmartWorking.css' invece che index.css globale
// 2. Aggiunge link a /smartworking/team e /smartworking/saved
// 3. Tutto il resto IDENTICO

import { Link } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { SW_DAYS_MAP, OFFICE_DAYS_MAP, generateAllPermutations } from './smartworking.js'
import './SmartWorking.css'

export default function SmartWorkingApp() {
  // ... TUTTO il codice esistente di App.jsx ...

  return (
    <div className="min-h-screen ...">
      {/* ... tutta la UI esistente ... */}

      {/* Aggiunte: link a team e saved */}
      <div className="sw-links">
        <Link to="/smartworking/team">👥 Vedi team</Link>
        <Link to="/smartworking/saved">💾 Combinazioni salvate</Link>
      </div>
    </div>
  )
}
```

#### Step 4: Dashboard EOS Timesheet

```jsx
// src/Dashboard.jsx
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const modules = [
    {
      title: 'Smart Working',
      description: 'Pianifica i tuoi giorni di smart working, visualizza il team, ricevi notifiche',
      icon: '🏠',
      path: '/smartworking',
      status: 'active',
    },
    {
      title: 'Timesheet',
      description: 'Registra le ore lavorate direttamente su Business Central EOS Prod',
      icon: '⏱️',
      path: '/timesheet',
      status: 'coming-soon',
    },
    {
      title: 'Report',
      description: 'Report mensili, statistiche, export Excel',
      icon: '📊',
      path: '/reports',
      status: 'coming-soon',
    },
  ]

  return (
    <div className="dashboard">
      <h1>EOS Timesheet</h1>
      <p className="subtitle">Gestione presenze e smart working</p>

      <div className="module-cards">
        {modules.map(m => (
          <Link key={m.path} to={m.path} className={`module-card ${m.status}`}>
            <span className="module-icon">{m.icon}</span>
            <h2>{m.title}</h2>
            <p>{m.description}</p>
            {m.status === 'coming-soon' && (
              <span className="badge">In sviluppo</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
```

#### Step 5: Placeholder Timesheet

```jsx
// src/modules/timesheet/TimesheetApp.jsx
export default function TimesheetApp() {
  return (
    <div className="placeholder-page">
      <span className="placeholder-icon">⏱️</span>
      <h2>Timesheet — In sviluppo</h2>
      <p>
        Questo modulo permetterà di registrare le ore lavorate
        direttamente su Business Central di EOS Prod.
      </p>
      <p className="coming-soon-note">
        Disponibile prossimamente
      </p>
    </div>
  )
}
```

#### Step 6: Configurazione Vite

```javascript
// vite.config.js — aggiunta alias
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/SmartWorkingDays/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@shared': path.resolve(__dirname, './src/modules/shared'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
```

#### Step 7: Verifica post-refactor

```bash
# 1. Tutti i test devono passare (51 esistenti)
npm test

# 2. Build produzione senza errori
npm run build

# 3. Deploy funzionante
npm run deploy

# 4. Test manuale navigazione
# - / → Dashboard
# - /smartworking → App SW funzionante
# - /smartworking/team → Vista team (placeholder se BC non configurato)
# - /smartworking/saved → Template salvati
# - /timesheet → Placeholder
```

#### Gestione GitHub Pages con React Router

**Problema:** GitHub Pages non supporta SPA routing (qualsiasi URL diverso da `/` dà 404).

**Soluzione 1: Hash router** (più semplice)
```jsx
// Usa HashRouter invece di BrowserRouter
import { HashRouter } from 'react-router-dom'
// URL: /SmartWorkingDays/#/smartworking/team
```
✅ Funziona sempre. ❌ URL con `#` sono meno eleganti.

**Soluzione 2: 404.html trick** (più elegante)
```html
<!-- dist/404.html — copia di index.html -->
<!-- GitHub Pages serve questo file per URL sconosciuti -->
<!-- Lo script reindirizza all'SPA -->
<script>
  sessionStorage.redirect = location.href
  location.replace('/SmartWorkingDays/')
</script>
```
✅ URL puliti. ❌ Leggero flicker al primo caricamento.

**Consigliato: HashRouter** per semplicità e robustezza.

#### Test previsti (~5 test)

```
App.test.jsx (nuovo)
├── routing
│   ├── / renderizza Dashboard
│   ├── /smartworking renderizza SmartWorkingApp
│   ├── /timesheet renderizza placeholder
│   └── link navigazione funzionanti
└── Dashboard
    └── mostra 3 card modulo (1 active, 2 coming-soon)
```

---

## Matrice di fattibilità riepilogativa

| Feature | Fattibilità | Complessità | Dipendenze | Rischio | Effort | Nuovi test |
|---|---|---|---|---|---|---|
| **1. Combinazioni salvate** | ✅ ALTA | Bassa | Nessuna | Nessuno | 1-2 gg | ~15 |
| **2. Consultazione team** | ✅ MEDIA | Media | BC | Basso | 3-5 gg | ~20 |
| **3. Coincidenze ufficio** | ✅ ALTA | Bassa | Nessuna (dopo #2) | Nessuno | 1-2 gg | ~8 |
| **4. Notifiche cambi stato** | ✅ MEDIA-ALTA | Media | BC | Medio | 3-4 gg | ~15 |
| **5. Integrazione EOS Timesheet** | ✅ ALTA | Media | Nessuna | Basso | 2-3 gg | ~5 |

**Totale effort:** 10-16 giorni (le feature 2, 3, 4 sono sequenziali; 1 e 5 sono indipendenti)  
**Totale nuovi test:** ~63 (in aggiunta ai 51 esistenti = 114 totali)

---

## Rischi trasversali e mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| **BC non accessibile in sviluppo** | Alta | Medio | Mock OData con nock nei test; modalità offline nell'app (dati mockati) |
| **Token Entra ID scaduto durante polling** | Bassa | Basso | MSAL.js gestisce refresh automatico; retry su 401 |
| **localStorage pieno o corrotto** | Bassa | Basso | Validazione JSON con try/catch; limite 20 template; reset silenzioso su dati corrotti |
| **Rate limit BC OData** | Molto bassa | Basso | Throttling 1 sec tra chiamate; polling 5 min (non 1 min); caching in memoria |
| **React Router + GitHub Pages (404)** | Alta (se BrowserRouter) | Medio | Usare HashRouter invece di BrowserRouter |
| **Performance con 100+ colleghi** | Bassa | Basso | Filtro lato client O(c×d) con max 500 operazioni; paginazione se necessario |
| **Refactor rompe funzionalità esistente** | Media | Alto | Approccio incrementale: sposta file → verifica build → aggiungi router → verifica test. Mai modificare logica e struttura insieme |

---

> **Conclusione:** Tutte le richieste sono tecnicamente fattibili con l'architettura attuale (SPA React + OData BC + localStorage). Non servono backend server, database aggiuntivi o infrastruttura cloud. Il rischio principale è il refactor architetturale (Fase 1), mitigato dall'approccio incrementale.

*Documento generato da IgelDev — 19 giugno 2026*
