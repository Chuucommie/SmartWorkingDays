# SmartWorkingDays — Analisi di fattibilità e piano modifiche

> **Documento tecnico**  
> Versione: 1.0 — Giugno 2026  
> Stato: **Analisi completata — Fattibilità POSITIVA**  
> Contesto: SmartWorkingDays come modulo dell'app EOS Timesheet

---

## 📋 Indice

1. [Analisi di fattibilità](#1-analisi-di-fattibilità)
   - [1.1 Combinazioni settimanali salvate](#11-combinazioni-settimanali-salvate)
   - [1.2 Consultazione team](#12-consultazione-team)
   - [1.3 Coincidenze in ufficio](#13-coincidenze-in-ufficio)
   - [1.4 Notifiche cambi stato](#14-notifiche-cambi-stato)
   - [1.5 Integrazione EOS Timesheet](#15-integrazione-eos-timesheet)
2. [Architettura target](#2-architettura-target)
3. [Piano di modifiche](#3-piano-di-modifiche)
   - [Fase 1: Infrastruttura multi-modulo](#fase-1-infrastruttura-multi-modulo)
   - [Fase 2: Combinazioni salvate](#fase-2-combinazioni-salvate)
   - [Fase 3: Vista team + coincidenze](#fase-3-vista-team--coincidenze)
   - [Fase 4: Notifiche cambi stato](#fase-4-notifiche-cambi-stato)
   - [Fase 5: Integrazione EOS Timesheet](#fase-5-integrazione-eos-timesheet)
4. [Riepilogo effort](#4-riepilogo-effort)
5. [Nuovi moduli previsti](#5-nuovi-moduli-previsti)

---

## 1. Analisi di fattibilità

### 1.1 Combinazioni settimanali salvate

**Richiesta:** L'utente può salvare una configurazione settimanale come "template" e richiamarla in futuro.

| Criterio | Valutazione |
|---|---|
| **Fattibilità tecnica** | ✅ **ALTA** — Puramente lato client, zero dipendenze esterne |
| **Complessità** | Bassa — localStorage + UI CRUD |
| **Rischio** | Nessuno |
| **Dipende da** | Nulla (totalmente autonomo) |

**Dettaglio tecnico:**
- Storage: `localStorage` con chiave `sw-saved-weeks`. Struttura dati:
  ```json
  [
    {
      "id": "uuid",
      "name": "Settimana tipo standard",
      "days": ["sw", "sw", "office", "sw", "sw"],
      "swDaysRequested": 3,
      "createdAt": "2026-06-19T10:00:00Z"
    }
  ]
  ```
- Max 20 template salvati (limite localStorage ~5MB)
- UI: dropdown "Carica combinazione salvata" + pulsante "Salva questa settimana"
- Esportazione/importazione JSON per backup

**Verdetto:** ✅ Fattibile. Implementabile in 1-2 giorni.

---

### 1.2 Consultazione team

**Richiesta:** I membri del team possono vedere la pianificazione SW degli altri membri.

| Criterio | Valutazione |
|---|---|
| **Fattibilità tecnica** | ✅ **MEDIA** — Richiede fonte dati condivisa (BC) |
| **Complessità** | Media — OData query + UI tabella team |
| **Rischio** | Basso — BC è già la fonte di verità per le pianificazioni |
| **Dipende da** | BC custom table `SW Planning` popolata, auth Entra ID |

**Dettaglio tecnico:**
- Fonte dati: Business Central (tabella custom `SW Planning`)
- Query OData: `GET /companies({id})/customTable_SWPlanning?$filter=weekStart eq '{monday}'&$expand=employee`
- L'API BC restituisce tutte le pianificazioni per quella settimana
- Lato client: filtra per `department` e `locationCode` dell'utente corrente
- UI: tabella "Il mio team questa settimana" con righe per ogni membro e 5 colonne giorno

**Verdetto:** ✅ Fattibile. Richiede che BC sia configurato e popolato (Fase 2 di INTEGRATION.md). Implementabile in 3-5 giorni.

---

### 1.3 Coincidenze in ufficio

**Richiesta:** Per membri stessa sede e stesso team, evidenziare i giorni in cui si coincide in ufficio.

| Criterio | Valutazione |
|---|---|
| **Fattibilità tecnica** | ✅ **ALTA** — Logica pura, testabile, senza API aggiuntive |
| **Complessità** | Bassa — Funzione pura + UI highlight |
| **Rischio** | Nessuno |
| **Dipende da** | Vista team funzionante (1.2) |

**Dettaglio tecnico:**
- Funzione pura `computeOfficeOverlaps(myPlan, teamPlans)`:
  ```javascript
  // Input: piano utente + array piani team
  // Output: { dayIndex: ['Mario Rossi', 'Anna Bianchi'], ... }
  function computeOfficeOverlaps(myPlan, teamPlans) {
    const overlaps = {}
    for (let day = 0; day < 5; day++) {
      if (myPlan[day] !== 'office') continue
      const colleagues = teamPlans
        .filter(p => p.employeeId !== myEmployeeId)
        .filter(p => p.week[day] === 'office')
        .map(p => p.employeeName)
      if (colleagues.length > 0) overlaps[day] = colleagues
    }
    return overlaps
  }
  ```
- UI: nella vista team, i giorni in cui l'utente è in ufficio mostrano un badge "👥 +2" con tooltip che elenca i colleghi
- Vista alternativa: "Calendario coincidenze" — matrice giorni × colleghi con pallini verdi

**Verdetto:** ✅ Fattibile. Pura logica frontend. Implementabile in 1-2 giorni dopo la vista team.

---

### 1.4 Notifiche cambi stato

**Richiesta:** L'utente seleziona membri specifici del team da "seguire" e riceve notifiche quando cambiano la loro pianificazione SW.

| Criterio | Valutazione |
|---|---|
| **Fattibilità tecnica** | ✅ **MEDIA-ALTA** — Polling-based, senza backend |
| **Complessità** | Media — Polling timer + diff engine + UI notifiche |
| **Rischio** | Medio — Rate limit BC OData se troppi utenti fanno polling |
| **Dipende da** | BC popolato, vista team funzionante |

**Dettaglio tecnico:**

**Approccio: Polling locale (consigliato)**
- L'utente seleziona quali membri seguire (checkbox nella vista team)
- Ogni 5 minuti, l'app fa GET OData per le pianificazioni dei membri seguiti
- Confronta con cache in memoria (last known state)
- Se differenza: mostra badge notifica + toast
- Vantaggi: nessun backend, nessun webhook, semplice
- Svantaggi: leggero ritardo (max 5 min), consumo API

**Approccio alternativo: Teams webhook (opzionale, futuro)**
- Quando un utente conferma la pianificazione, l'app invia anche una notifica a un webhook Teams
- Il webhook smista la notifica ai "follower" configurati
- Richiede backend o Azure Function
- Non implementato in questa fase

**Struttura dati notifiche:**
```javascript
// localStorage: sw-watched-members
["employeeId1", "employeeId2"]

// In memoria durante la sessione: lastKnownPlans
{
  "employeeId1": { week: ["sw","sw","office","sw","sw"], hash: "abc123" },
  "employeeId2": { week: ["office","office","office","sw","sw"], hash: "def456" }
}
```

**UI notifiche:**
- Badge numerico nell'header: "🔔 2" (2 membri hanno cambiato)
- Dropdown notifiche: "Anna ha cambiato: ora 3 SW → 2 SW"
- Toast temporaneo all'apertura app
- Polling attivo solo quando l'app è in foreground (visibility API)

**Rate limit BC OData:**
- BC non ha rate limit documentati, ma polling ogni 5 min × 10 membri = 10 richieste/5min = 120/ora
- Accettabile. Caching intermedio (1 min) riduce ulteriormente

**Verdetto:** ✅ Fattibile con polling. Implementabile in 3-4 giorni.

---

### 1.5 Integrazione EOS Timesheet

**Richiesta:** SmartWorkingDays come modulo di un'app più ampia "EOS Timesheet" che permette di scrivere ore su Business Central di EOS Prod.

| Criterio | Valutazione |
|---|---|
| **Fattibilità tecnica** | ✅ **ALTA** — Stessa codebase React, routing multi-modulo |
| **Complessità** | Media — Refactor architetturale senza rompere funzionalità esistente |
| **Rischio** | Basso — Modifiche incrementali, ogni modulo indipendente |
| **Dipende da** | React Router, refactor struttura cartelle |

**Dettaglio tecnico:**

**Architettura EOS Timesheet (app ombrello):**
```
EOS Timesheet (SPA React)
├── Modulo Timesheet        (scrittura ore su BC EOS Prod)
├── Modulo Smart Working    (esistente, da adattare)
├── Modulo Team View        (nuovo)
├── Modulo Notifiche        (nuovo)
└── Moduli futuri...        (espandibile)
```

**Struttura cartelle target:**
```
src/
├── modules/
│   ├── smartworking/
│   │   ├── SmartWorkingApp.jsx     (ex App.jsx, adattato)
│   │   ├── smartworking.js         (logica pura — invariato)
│   │   ├── smartworking.test.js    (51 test — invariati)
│   │   ├── savedWeeks.js           (NUOVO: template salvati)
│   │   ├── savedWeeks.test.js
│   │   ├── teamView.js             (NUOVO: vista team + coincidenze)
│   │   ├── teamView.test.js
│   │   ├── teamWatcher.js          (NUOVO: polling notifiche)
│   │   └── teamWatcher.test.js
│   │
│   ├── timesheet/                  (futuro)
│   │   └── ...
│   │
│   └── shared/
│       ├── msAuth.js               (auth MS365, condiviso)
│       ├── businessCentral.js      (client BC OData, condiviso)
│       ├── outlookCalendar.js      (client Graph, condiviso)
│       └── teamsNotify.js          (notifiche Teams, condiviso)
│
├── App.jsx                         (router principale)
├── index.css                       (stili globali)
└── main.jsx                        (entry point)
```

**Routing (React Router):**
```
/                        → Dashboard EOS Timesheet (futuro)
/smartworking            → SmartWorkingDays (modulo esistente)
/smartworking/team       → Vista team + coincidenze
/smartworking/saved      → Template salvati
/timesheet               → Timesheet (futuro)
/timesheet/...           → Sotto-pagine timesheet (futuro)
```

**BC EOS Prod vs BC esistente:**
- Se stesso tenant: stesso token Entra ID, company ID diverso
- Se tenant diverso: multi-tenant auth (complessità aggiuntiva)
- **Assunzione per questa analisi:** stesso tenant, company ID configurabile

**Verdetto:** ✅ Fattibile. Refactor architetturale senza rompere la logica esistente. Implementabile in 3-5 giorni per la struttura base.

---

## 2. Architettura target

```
┌─────────────────────────────────────────────────────────────┐
│                     EOS Timesheet (SPA)                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    React Router                       │   │
│  │  /                → Dashboard                         │   │
│  │  /smartworking    → SmartWorking Module               │   │
│  │  /smartworking/team     → Team View + Coincidenze     │   │
│  │  /smartworking/saved    → Template Salvati            │   │
│  │  /timesheet       → Timesheet Module (futuro)         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 Moduli condivisi                      │   │
│  │  msAuth.js │ businessCentral.js │ outlookCalendar.js │   │
│  │  teamsNotify.js │ config.ts                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ SmartWorking     │  │ Timesheet    │  │ Futuri       │   │
│  │ Module           │  │ Module       │  │ moduli...    │   │
│  │                  │  │ (da creare)  │  │              │   │
│  │ • Pianificazione │  │ • Scrittura  │  │              │   │
│  │ • Permutazioni   │  │   ore BC     │  │              │   │
│  │ • Template       │  │ • Report     │  │              │   │
│  │ • Team View      │  │ • ...        │  │              │   │
│  │ • Coincidenze    │  │              │  │              │   │
│  │ • Notifiche      │  │              │  │              │   │
│  └──────────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Piano di modifiche

### Fase 1: Infrastruttura multi-modulo

**Obiettivo:** Trasformare la SPA standalone in un'app multi-modulo con routing, senza rompere la funzionalità esistente.

**Durata stimata:** 3-5 giorni

#### Task

| # | Task | File coinvolti | Test |
|---|---|---|---|
| 1.1 | Installare React Router | `package.json` | — |
| 1.2 | Creare `src/modules/` e spostare `App.jsx` → `src/modules/smartworking/SmartWorkingApp.jsx` | Nuovo file, `App.jsx` modificato | Verificare che build funzioni |
| 1.3 | Spostare `smartworking.js` e `smartworking.test.js` in `src/modules/smartworking/` | Spostamento file | 51 test devono passare |
| 1.4 | Creare `src/App.jsx` come router principale con React Router | Nuovo file | Test routing |
| 1.5 | Spostare `index.css` stili specifici SW in `src/modules/smartworking/SmartWorking.css` | Nuovo file | Build CSS corretto |
| 1.6 | Aggiornare `vite.config.ts` per supportare alias `@/` → `src/` | `vite.config.ts` | Build funzionante |
| 1.7 | Verificare che l'app funzioni esattamente come prima su `/smartworking` | — | Test manuale + 51 test |

**Criterio di accettazione:**
- URL `https://Chuucommie.github.io/SmartWorkingDays/smartworking` mostra l'app SW identica a oggi
- Tutti i 51 test passano
- Build produzione funzionante
- `npm run deploy` funzionante

---

### Fase 2: Combinazioni salvate

**Obiettivo:** L'utente può salvare, caricare, rinominare ed eliminare configurazioni settimanali.

**Durata stimata:** 1-2 giorni

#### Task

| # | Task | File coinvolti | Test |
|---|---|---|---|
| 2.1 | Creare `src/modules/smartworking/savedWeeks.js` — logica pura CRUD su localStorage | Nuovo file | Test unitari |
| 2.2 | Scrivere `savedWeeks.test.js` — test per save, load, list, delete, rename, limit 20, import/export | Nuovo file | ~15 test |
| 2.3 | Aggiungere UI: dropdown "Carica combinazione" nella SmartWorkingApp | `SmartWorkingApp.jsx` | — |
| 2.4 | Aggiungere UI: pulsante "Salva questa settimana" con modale per nome | `SmartWorkingApp.jsx` | — |
| 2.5 | Aggiungere UI: pagina `/smartworking/saved` per gestire template (rinomina, elimina, esporta) | Nuovo componente | — |
| 2.6 | Aggiungere import/export JSON (pulsante esporta tutto, importa da file) | `savedWeeks.js` + UI | Test import/export |

**Criterio di accettazione:**
- Salvo una settimana con nome "Standard", cambio configurazione, la ricarico dal dropdown → i 5 giorni tornano come salvati
- Esporto i template in JSON, li importo in un altro browser → funzionanti
- Massimo 20 template, il 21esimo dà messaggio "Limite raggiunto"

---

### Fase 3: Vista team + coincidenze

**Obiettivo:** L'utente vede le pianificazioni SW dei colleghi (stesso dipartimento + stessa sede) e i giorni in cui coincidono in ufficio.

**Durata stimata:** 3-5 giorni

**Prerequisito:** BC popolato con pianificazioni (Fase 2 INTEGRATION.md) o mock data per sviluppo.

#### Task

| # | Task | File coinvolti | Test |
|---|---|---|---|
| 3.1 | Creare `src/modules/smartworking/teamView.js` — logica pura: fetch team plans, compute overlaps | Nuovo file | Test unitari |
| 3.2 | Scrivere `teamView.test.js` — test per fetch, filter by department/location, overlaps | Nuovo file | ~20 test |
| 3.3 | Aggiungere endpoint BC in `src/modules/shared/businessCentral.js`: `fetchTeamPlans(weekStart)` | `businessCentral.js` | Test mock OData |
| 3.4 | Creare UI: pagina `/smartworking/team` — tabella "Il mio team questa settimana" | Nuovo componente | — |
| 3.5 | UI tabella team: righe per membro, 5 colonne giorno con icona stato, badge "👥 +2" su giorni coincidenza | Nuovo componente | — |
| 3.6 | UI: tooltip su badge coincidenza con elenco nomi colleghi | Nuovo componente | — |
| 3.7 | UI: vista "Calendario coincidenze" — matrice giorni × colleghi | Nuovo componente (opzionale) | — |
| 3.8 | Aggiungere link "Vedi team" nella SmartWorkingApp principale | `SmartWorkingApp.jsx` | — |

**Criterio di accettazione:**
- Apro `/smartworking/team`, vedo tutti i membri del mio dipartimento con la loro pianificazione
- Nei giorni in cui sono in ufficio, vedo un badge con quanti colleghi sono anch'essi in ufficio
- Clicco sul badge → tooltip: "Mario Rossi, Anna Bianchi"
- Se cambio dipartimento/sede in BC, la vista team si aggiorna

---

### Fase 4: Notifiche cambi stato

**Obiettivo:** L'utente seleziona membri da seguire e riceve notifiche quando cambiano pianificazione.

**Durata stimata:** 3-4 giorni

#### Task

| # | Task | File coinvolti | Test |
|---|---|---|---|
| 4.1 | Creare `src/modules/smartworking/teamWatcher.js` — logica pura: watch list, polling, diff detection | Nuovo file | Test unitari |
| 4.2 | Scrivere `teamWatcher.test.js` — test per add/remove watched, diff detection, hash comparison | Nuovo file | ~15 test |
| 4.3 | Implementare polling timer (5 min) con visibility API (pausa quando tab non attivo) | `teamWatcher.js` | Test timer |
| 4.4 | Creare UI: checkbox "Segui" nella vista team per ogni membro | Componente team view | — |
| 4.5 | Creare UI: badge notifiche nell'header "🔔 N" | `SmartWorkingApp.jsx` o componente shared | — |
| 4.6 | Creare UI: dropdown notifiche con elenco cambi ("Anna: 3 SW → 2 SW") | Nuovo componente | — |
| 4.7 | Creare UI: toast all'apertura app se ci sono notifiche non lette | Nuovo componente | — |
| 4.8 | Persistere "membri seguiti" in localStorage | `teamWatcher.js` | Test persistenza |
| 4.9 | Persistere "ultimo stato noto" in memoria (non localStorage — ricostruito a ogni apertura) | `teamWatcher.js` | Test ricostruzione |

**Criterio di accettazione:**
- Nella vista team, spunto "Segui" su Anna e Mario
- Anna cambia pianificazione → dopo max 5 min vedo badge "🔔 1"
- Apro dropdown → "Anna: Lun SW→Ufficio, Mar Ufficio→SW"
- Chiudo il tab, riapro dopo 10 min → le notifiche vengono rilevate al primo polling
- Smarcando "Segui" su Anna → non ricevo più sue notifiche

---

### Fase 5: Integrazione EOS Timesheet

**Obiettivo:** SmartWorkingDays è navigabile come modulo dell'app EOS Timesheet. Placeholder per modulo Timesheet futuro.

**Durata stimata:** 2-3 giorni

#### Task

| # | Task | File coinvolti | Test |
|---|---|---|---|
| 5.1 | Aggiornare `App.jsx` router con rotta `/` → dashboard EOS Timesheet (placeholder elegante) | `App.jsx` | — |
| 5.2 | Creare dashboard EOS Timesheet: card "Smart Working", "Timesheet" (coming soon), "Report" (coming soon) | Nuovo componente | — |
| 5.3 | Aggiornare `package.json` homepage a `/EOSTimesheet/` (o mantenere `/SmartWorkingDays/` con redirect) | `package.json` | Build + deploy |
| 5.4 | Aggiornare `vite.config.ts` base path | `vite.config.ts` | Build |
| 5.5 | Verificare navigazione: dashboard → SmartWorking → Team → Saved → dashboard | — | Test manuale |
| 5.6 | Aggiornare README.md con nuova struttura | `README.md` | — |

**Criterio di accettazione:**
- Apro l'app → vedo dashboard EOS Timesheet con card moduli
- Clicco "Smart Working" → navigo a `/smartworking` → app SW funzionante
- Navigo tra le sezioni SW (team, saved) e torno alla dashboard
- Placeholder Timesheet mostra "In sviluppo"

---

## 4. Riepilogo effort

| Fase | Descrizione | Giorni | Dipende da |
|---|---|---|---|
| **Fase 1** | Infrastruttura multi-modulo (React Router, refactor cartelle) | 3-5 | — |
| **Fase 2** | Combinazioni salvate (template settimanali) | 1-2 | Fase 1 |
| **Fase 3** | Vista team + coincidenze ufficio | 3-5 | Fase 1 + BC popolato |
| **Fase 4** | Notifiche cambi stato (polling) | 3-4 | Fase 3 |
| **Fase 5** | Integrazione EOS Timesheet (dashboard, routing finale) | 2-3 | Fase 1 |
| **Totale** | | **12-19 giorni** | |

**Nota:** Le fasi 2, 3, 4 sono indipendenti tra loro e possono essere parallelizzate dopo la Fase 1.

---

## 5. Nuovi moduli previsti

```
src/
├── modules/
│   ├── smartworking/
│   │   ├── SmartWorkingApp.jsx       (ex App.jsx, rifattorizzato)
│   │   ├── SmartWorking.css          (stili specifici SW)
│   │   ├── smartworking.js           (logica pura — invariato)
│   │   ├── smartworking.test.js      (51 test — invariati)
│   │   │
│   │   ├── savedWeeks.js             ✨ NUOVO — CRUD template localStorage
│   │   ├── savedWeeks.test.js        ✨ NUOVO — ~15 test
│   │   │
│   │   ├── teamView.js               ✨ NUOVO — fetch team plans + overlaps
│   │   ├── teamView.test.js          ✨ NUOVO — ~20 test
│   │   │
│   │   ├── teamWatcher.js            ✨ NUOVO — polling + diff detection
│   │   ├── teamWatcher.test.js       ✨ NUOVO — ~15 test
│   │   │
│   │   ├── TeamViewPage.jsx          ✨ NUOVO — UI vista team
│   │   ├── SavedWeeksPage.jsx        ✨ NUOVO — UI gestione template
│   │   └── NotificationBell.jsx      ✨ NUOVO — UI badge + dropdown notifiche
│   │
│   ├── timesheet/                    (futuro — non in questo piano)
│   │   └── ...
│   │
│   └── shared/
│       ├── msAuth.js                 ✨ NUOVO — MSAL.js auth (da INTEGRATION.md)
│       ├── businessCentral.js        ✨ NUOVO — client BC OData (da INTEGRATION.md)
│       ├── outlookCalendar.js        ✨ NUOVO — client Graph (da INTEGRATION.md)
│       ├── teamsNotify.js            ✨ NUOVO — notifiche Teams (da INTEGRATION.md)
│       └── config.ts                 ✨ NUOVO — configurazione app
│
├── App.jsx                           (router principale)
├── Dashboard.jsx                     ✨ NUOVO — dashboard EOS Timesheet
├── index.css                         (stili globali)
└── main.jsx                          (entry point — invariato)
```

**Totale nuovi file:** 15  
**Totale nuovi test:** ~50 (in aggiunta ai 51 esistenti)  
**File modificati:** 5 (App.jsx, package.json, vite.config.ts, README.md, index.css)

---

## Appendice: Verifica post-implementazione

Al termine di ogni fase, eseguire:

```bash
npm test           # Tutti i test (51 + nuovi) devono passare
npm run build      # Build produzione senza errori
npm run deploy     # Deploy su GitHub Pages funzionante
```

**Test manuali aggiuntivi:**
- [ ] Navigazione tra tutte le route funzionante
- [ ] Back/forward browser preserva lo stato
- [ ] Refresh pagina mantiene la route corrente
- [ ] localStorage non si corrompe con dati malformati
- [ ] Polling si ferma quando il tab non è attivo
- [ ] Nessun memory leak (timer puliti all'unmount)

---

> **Nota:** Questo piano copre SOLO le modifiche all'app SmartWorkingDays. Il modulo Timesheet e altri moduli EOS saranno oggetto di piani separati.

*Documento generato da IgelDev — 19 giugno 2026*
