# SmartWorkingDays — Integrazione con Business Central, Teams e Outlook

> **Documento di specifica tecnica e funzionale**  
> Versione: 1.0 — Giugno 2026  
> Stato: **Progettazione** (non ancora implementato)

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Business Central](#1-business-central)
   - [Cosa si integra](#11-cosa-si-integra)
   - [Architettura tecnica](#12-architettura-tecnica)
   - [Impatto su UI e backend](#13-impatto-su-ui-e-backend)
3. [Microsoft Teams](#2-microsoft-teams)
   - [Cosa si integra](#21-cosa-si-integra)
   - [Architettura tecnica](#22-architettura-tecnica)
   - [Impatto su UI e backend](#23-impatto-su-ui-e-backend)
4. [Microsoft Outlook](#3-microsoft-outlook)
   - [Cosa si integra](#31-cosa-si-integra)
   - [Architettura tecnica](#32-architettura-tecnica)
   - [Impatto su UI e backend](#33-impatto-su-ui-e-backend)
5. [Integrazione combinata: il flusso completo](#4-integrazione-combinata-il-flusso-completo)
6. [Considerazioni di sicurezza](#5-considerazioni-di-sicurezza)
7. [Roadmap implementativa](#6-roadmap-implementativa)

---

## Panoramica

SmartWorkingDays è oggi una SPA React che calcola permutazioni SW/Ufficio in base alla regola aziendale del 60%. L'integrazione con l'ecosistema Microsoft 365 (Business Central, Teams, Outlook) la trasformerebbe da **calcolatore standalone** a **hub operativo** per la gestione completa dello smart working aziendale.

### Visione integrata

```
┌──────────────────────────────────────────────────────────────┐
│                     SmartWorkingDays                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ React UI │  │ API Layer│  │ Scheduler│  │ MS365 Client│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│       │              │              │               │        │
└───────┼──────────────┼──────────────┼───────────────┼────────┘
        │              │              │               │
        ▼              ▼              ▼               ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
   │ Browser │  │ BC API   │  │ Cron Job │  │ Graph API    │
   │ (utente)│  │ (ODATA)  │  │ (node)   │  │ (MS365)      │
   └─────────┘  └──────────┘  └──────────┘  └──────────────┘
```

---

## 1. Business Central

### 1.1 Cosa si integra

| Funzionalità | Descrizione |
|---|---|
| **Lettura presenze** | Recupera dal *Employee Attendance* o *Time Registration* i giorni già registrati come SW/Ufficio/Assenza |
| **Scrittura pianificazione** | Invia la settimana scelta dall'utente come *planned attendance* in BC |
| **Validazione regole aziendali** | BC espone le policy SW (es. 60%) via API — l'app le consuma invece di hardcodarle |
| **Approvazione manager** | Invia richiesta di approvazione al workflow BC; l'app mostra lo stato (pending/approved/rejected) |
| **Statistiche dipartimentali** | Recupera dati aggregati: quanti SW questo mese, trend, occupancy ufficio |

### 1.2 Architettura tecnica

#### Autenticazione
```
OAuth 2.0 con Microsoft Entra ID (Azure AD)
├── App Registration in Azure Portal
├── Delegated permissions: BC API access (user impersonation)
├── Token refresh automatico via MSAL.js (lato browser) o msal-node (backend)
└── Scope: https://api.businesscentral.dynamics.com/.default
```

#### Endpoint BC (OData v4)

| Operazione | Metodo | Endpoint |
|---|---|---|
| Leggi presenze dipendente | `GET` | `/companies({id})/employees({employeeId})/timeRegistrationEntries?$filter=date ge {start} and date le {end}` |
| Scrivi pianificazione | `POST` | `/companies({id})/customTable_SWPlanning` (tabella custom AL) |
| Leggi policy aziendale | `GET` | `/companies({id})/customTable_SWPolicy` |
| Invia per approvazione | `POST` | `/companies({id})/workflow_SWApproval` |
| Statistiche reparto | `GET` | `/companies({id})/customTable_SWStats?$apply=groupby((department))` |

#### Tabella custom AL necessaria in BC

```al
table 50110 "SW Planning"
{
    DataClassification = CustomerContent;
    Caption = 'Smart Working Planning';

    fields
    {
        field(1; "Entry No."; Integer) { AutoIncrement = true; }
        field(2; "Employee No."; Code[20]) { TableRelation = Employee."No."; }
        field(3; "Week Start"; Date) { }
        field(4; "Monday"; Enum "SW Day Type") { }
        field(5; "Tuesday"; Enum "SW Day Type") { }
        field(6; "Wednesday"; Enum "SW Day Type") { }
        field(7; "Thursday"; Enum "SW Day Type") { }
        field(8; "Friday"; Enum "SW Day Type") { }
        field(9; "Status"; Enum "SW Approval Status") { }
        field(10; "Submitted By"; Code[50]) { }
        field(11; "Approved By"; Code[50]) { }
        field(12; "Notes"; Text[250]) { }
    }

    keys
    {
        key(PK; "Entry No.") { Clustered = true; }
        key(EmployeeWeek; "Employee No.", "Week Start") { Unique = true; }
    }
}

enum 50111 "SW Day Type"
{
    Extensible = false;
    value(0; "Free") { Caption = 'Libero'; }
    value(1; "SmartWorking") { Caption = 'Smart Working'; }
    value(2; "Office") { Caption = 'Ufficio'; }
    value(3; "Absent") { Caption = 'Assenza'; }
}

enum 50112 "SW Approval Status"
{
    Extensible = false;
    value(0; "Draft") { Caption = 'Bozza'; }
    value(1; "Pending") { Caption = 'In approvazione'; }
    value(2; "Approved") { Caption = 'Approvato'; }
    value(3; "Rejected") { Caption = 'Rifiutato'; }
}
```

#### Flusso dati

```
1. App → GET /timeRegistrationEntries → popola i giorni già fissati
2. Utente configura la settimana nell'app
3. App → POST /customTable_SWPlanning → salva pianificazione
4. App → POST /workflow_SWApproval → avvia workflow approvazione
5. App → GET /customTable_SWPlanning?$filter=status eq 'Pending' → polling stato
```

### 1.3 Impatto su UI e backend

#### UI
- **Nuovo pulsante "Sincronizza da BC"**: importa presenze già registrate e pre-compila i 5 giorni
- **Badge di stato approvazione** su ogni permutazione: 🟡 pending, 🟢 approved, 🔴 rejected
- **Dropdown dipendente** (se l'utente è manager): seleziona un employee e ne visualizza/modifica la pianificazione
- **Dashboard statistiche**: grafico a barre SW vs Ufficio del mese corrente (dati da BC)
- **Toggle "Usa policy BC"**: se attivo, i target SW/Ufficio vengono letti da BC invece che dalla mappa hardcodata

#### Backend
- **Nuovo modulo `src/businessCentral.js`**:
  - `fetchAttendance(employeeId, weekStart)` → GET OData
  - `savePlanning(employeeId, weekPlan)` → POST OData
  - `submitForApproval(entryId)` → POST workflow
  - `fetchPolicy()` → GET policy aziendale
  - `fetchStats(department, month)` → GET statistiche
- **MSAL.js** per auth lato browser (PKCE flow)
- **Cache locale** (localStorage) per ridurre chiamate API
- **Test dedicati** in `src/businessCentral.test.js` con mock OData

---

## 2. Microsoft Teams

### 2.1 Cosa si integra

| Funzionalità | Descrizione |
|---|---|
| **Bot conversazionale** | L'utente scrive in chat "pianifica SW la prossima settimana" e il bot risponde con una Adaptive Card interattiva |
| **Notifiche approvazione** | Quando il manager approva/rifiuta in BC, il dipendente riceve un messaggio in Teams |
| **Adaptive Card pianificazione** | Card interattiva dentro Teams che replica la UI dell'app (selettore giorni, permutazioni) |
| **Comandi rapidi** | `/sw plan`, `/sw status`, `/sw stats` — shortcut da chat Teams |
| **Tab in canale** | L'app React è embeddable come Tab in un canale Teams del reparto |
| **Reminder automatici** | Ogni lunedì mattina, il bot pinga chi non ha ancora pianificato la settimana |

### 2.2 Architettura tecnica

#### Bot Framework

```
SmartWorkingDays Bot
├── Registrato su Azure Bot Service
├── Endpoint: https://smartworkingdays.example.com/api/teams/messages
├── Messaging endpoint riceve Activity da Teams
├── Autenticazione: Bot ID + Client Secret (Azure)
└── Canali: Teams (primario), eventualmente Slack/Web Chat
```

#### Adaptive Card — esempio pianificazione

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "Pianifica la tua settimana SW",
      "weight": "Bolder",
      "size": "Large"
    },
    {
      "type": "ColumnSet",
      "columns": [
        {
          "type": "Column",
          "items": [
            {
              "type": "Input.ChoiceSet",
              "id": "monday",
              "choices": [
                { "title": "🏠 SW", "value": "sw" },
                { "title": "🏢 Ufficio", "value": "office" },
                { "title": "✕ Assenza", "value": "absent" },
                { "title": "◌ Libero", "value": "free" }
              ],
              "placeholder": "Lun"
            }
          ]
        }
        // ... Mar, Mer, Gio, Ven
      ]
    },
    {
      "type": "TextBlock",
      "text": "${swTarget} giorni SW · ${officeTarget} giorni Ufficio",
      "isSubtle": true
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Conferma pianificazione",
      "data": { "action": "submitPlan" }
    }
  ]
}
```

#### Comandi bot

| Comando | Risposta |
|---|---|
| `/sw plan` | Adaptive Card per pianificare la settimana corrente |
| `/sw status` | Stato approvazione pianificazione corrente |
| `/sw stats` | Riepilogo mensile personale (da BC) |
| `/sw team` | Riepilogo SW del team (se manager) |
| `/sw remind` | Forza un reminder ai membri del team (manager only) |

#### Flusso notifiche

```
1. BC workflow approvazione completato
2. BC → webhook → SmartWorkingDays backend
3. Backend → Bot Framework REST API → messaggio proattivo in Teams
4. Utente riceve: "✅ La tua pianificazione SW è stata approvata"
```

### 2.3 Impatto su UI e backend

#### UI (React)
- **Nessuna modifica alla UI esistente** — l'app web rimane identica
- **Nuova route `/teams-tab`**: versione compatta ottimizzata per iframe Teams (larghezza 280-400px)
- **Configurazione Teams**: file `manifest.json` per il pacchetto Teams app

#### Backend
- **Nuovo modulo `src/teamsBot.js`** (Node.js, separato dal bundle React):
  - `handleMessage(activity)` → router comandi
  - `sendAdaptiveCard(conversationId, card)` → invia card interattiva
  - `sendProactiveMessage(userId, text)` → notifica non sollecitata
  - `handleSubmit(actionData)` → processa risposta da Adaptive Card
- **Endpoint Express** (o serverless function):
  - `POST /api/teams/messages` — webhook Bot Framework
  - `POST /api/teams/notify` — endpoint per trigger da BC webhook
- **Database notifiche**: traccia messaggi inviati, stato consegna
- **Test dedicati** in `src/teamsBot.test.js` con mock Activity

---

## 3. Microsoft Outlook

### 3.1 Cosa si integra

| Funzionalità | Descrizione |
|---|---|
| **Lettura calendario** | Recupera eventi Outlook (ferie, permessi, meeting) e li mappa come giorni "Assenza" o "Ufficio" |
| **Scrittura eventi SW** | Crea eventi ricorrenti "Smart Working" nei giorni scelti, con promemoria |
| **Email automatiche** | Invio riepilogo settimanale, notifica approvazione, reminder pianificazione |
| **Firma email dinamica** | Aggiunge alla firma lo stato SW della settimana ("Questa settimana: 3 SW, 2 Ufficio") |
| **Outlook Add-in** | Pannello laterale in Outlook Web/Desktop che mostra la pianificazione SW |

### 3.2 Architettura tecnica

#### Microsoft Graph API

```
Endpoint base: https://graph.microsoft.com/v1.0
Auth: OAuth 2.0 (stesso token Entra ID di BC, scope aggiuntivi)
```

#### Endpoint Graph usati

| Operazione | Metodo | Endpoint |
|---|---|---|
| Leggi eventi calendario | `GET` | `/me/calendar/calendarView?startDateTime={start}&endDateTime={end}` |
| Crea evento SW | `POST` | `/me/calendar/events` |
| Invia email | `POST` | `/me/sendMail` |
| Leggi out-of-office | `GET` | `/me/mailboxSettings/automaticRepliesSetting` |
| Imposta firma | `PATCH` | `/me/mailboxSettings` (solo admin) |

#### Payload creazione evento SW

```json
{
  "subject": "🏠 Smart Working",
  "body": {
    "contentType": "HTML",
    "content": "Giorno di Smart Working pianificato tramite SmartWorkingDays."
  },
  "start": { "dateTime": "2026-06-23T00:00:00", "timeZone": "Europe/Rome" },
  "end": { "dateTime": "2026-06-23T23:59:00", "timeZone": "Europe/Rome" },
  "isAllDay": true,
  "showAs": "workingElsewhere",
  "categories": ["Smart Working"],
  "reminderMinutesBeforeStart": 0
}
```

#### Flusso sincronizzazione calendario

```
1. App → GET /me/calendar/calendarView → recupera eventi della settimana
2. Eventi con categoria "Ferie" o showAs="oof" → giorno = 'absent'
3. Eventi con showAs="busy" e location contiene "Ufficio" → giorno = 'office'
4. Giorni senza eventi → giorno = 'free'
5. Utente modifica e conferma
6. App → POST /me/calendar/events per ogni giorno SW → crea eventi
7. App → POST /me/sendMail → invia riepilogo a manager (se configurato)
```

#### Email automatiche

| Trigger | Destinatario | Contenuto |
|---|---|---|
| Pianificazione inviata | Manager | "X ha pianificato 3 SW e 2 Ufficio per la settimana Y" |
| Approvazione ricevuta | Dipendente | "La tua pianificazione è stata approvata/rifiutata" |
| Lunedì senza piano | Dipendente | "Non hai ancora pianificato la settimana — clicca qui" |
| Venerdì riepilogo | Dipendente | Riepilogo SW della settimana, statistiche mese |

### 3.3 Impatto su UI e backend

#### UI
- **Pulsante "Importa da calendario"**: popola i giorni in base agli eventi Outlook
- **Pulsante "Esporta su calendario"**: crea eventi Outlook per i giorni SW scelti
- **Checkbox "Invia email al manager"**: attiva/disattiva notifica via email
- **Sezione "Eventi Outlook rilevati"**: mostra in una mini-tabella gli eventi della settimana che hanno influenzato la pre-compilazione
- **Outlook Add-in** (separato, React-based):
  - Pannello laterale in Outlook che mostra la pianificazione corrente
  - Pulsante "Modifica" che apre l'app completa in una finestra

#### Backend
- **Nuovo modulo `src/outlookGraph.js`**:
  - `fetchCalendarWeek(startDate)` → GET Graph calendarView
  - `mapEventsToDayStates(events)` → converte eventi in ['free','sw','office','absent']
  - `createSWEvents(weekPlan)` → POST eventi per ogni giorno SW
  - `sendApprovalEmail(managerEmail, plan)` → POST sendMail
  - `sendReminderEmail(userEmail)` → POST sendMail
- **Gestione rate limit Graph**: throttling, retry con backoff
- **Test dedicati** in `src/outlookGraph.test.js` con mock Graph API

---

## 4. Integrazione combinata: il flusso completo

### Scenario: pianificazione settimanale con ecosistema completo

```
LUNEDÌ MATTINA
├── Teams Bot invia reminder: "Pianifica la tua settimana SW"
├── Utente clicca → Adaptive Card o apre l'app web
│
CONFIGURAZIONE (nell'app)
├── [1] App → GET BC /timeRegistrationEntries → giorni già registrati
├── [2] App → GET Graph /calendarView → eventi Outlook (ferie, meeting)
├── [3] UI pre-compila: Lun=Ufficio (meeting), Mer=Assenza (ferie), altri=Liberi
├── [4] Utente modifica: Gio→SW, Ven→SW
├── [5] App calcola permutazioni e mostra 3 valide
├── [6] Utente seleziona e conferma
│
SALVATAGGIO E NOTIFICHE
├── [7] App → POST BC /customTable_SWPlanning → salva pianificazione
├── [8] App → POST BC /workflow_SWApproval → avvia approvazione
├── [9] App → POST Graph /me/calendar/events → crea eventi SW su Outlook
├── [10] App → POST Graph /me/sendMail → email al manager
├── [11] Teams Bot → messaggio conferma: "Pianificazione inviata ✅"
│
APPROVAZIONE (qualche ora dopo)
├── Manager approva in BC
├── BC → webhook → SmartWorkingDays backend
├── Backend → Teams Bot → messaggio proattivo: "Approvata! 🟢"
├── Backend → Graph sendMail → email conferma approvazione
└── UI (al prossimo refresh) → badge verde su pianificazione
```

---

## 5. Considerazioni di sicurezza

| Aspetto | Soluzione |
|---|---|
| **Auth** | OAuth 2.0 PKCE (browser) + Client Credentials (backend cron). Token MAI in localStorage — solo in memoria o httpOnly cookie |
| **API key** | Bot Secret, Client Secret in variabili d'ambiente (`.env`), mai nel repo |
| **CORS** | Backend API accetta solo origine `https://Chuucommie.github.io` e `https://teams.microsoft.com` |
| **Rate limit** | Graph: 10k richieste/min per app — throttling lato client con retry-after. BC OData: nessun limite documentato ma caching aggressivo |
| **Dati sensibili** | Pianificazioni SW non sono dati critici, ma email/employeeId sì — minimizzare log, nessun dato in URL query string |
| **GDPR** | Se usato in azienda EU: base giuridica = legittimo interesse (gestione orario). Dati conservati max 24 mesi in BC |
| **Tenant isolation** | L'app è single-tenant (un'azienda). Multi-tenant richiederebbe `/common` o `/organizations` endpoint + lookup tenant |

---

## 6. Roadmap implementativa

### Fase 1 — Fondamenta (2-3 settimane)
- [ ] App Registration su Azure (Entra ID)
- [ ] Modulo `src/msAuth.js` con MSAL.js (PKCE flow)
- [ ] Bottone "Login Microsoft" nella UI
- [ ] Modulo `src/businessCentral.js` con `fetchAttendance()` e `savePlanning()`
- [ ] Test con mock OData

### Fase 2 — BC Integration (2 settimane)
- [ ] Tabella custom AL `SW Planning` + enum in BC
- [ ] Endpoint OData esposti da BC
- [ ] UI: import presenze, salva pianificazione, badge stato
- [ ] Workflow approvazione in BC

### Fase 3 — Teams Bot (2-3 settimane)
- [ ] Azure Bot Service registration
- [ ] Backend Node.js per messaggi Teams
- [ ] Adaptive Card pianificazione
- [ ] Comandi `/sw plan`, `/sw status`
- [ ] Notifiche proattive da webhook BC

### Fase 4 — Outlook (2 settimane)
- [ ] Modulo `src/outlookGraph.js`
- [ ] UI: import/export calendario
- [ ] Email automatiche (reminder, riepilogo)
- [ ] Outlook Add-in (pannello laterale)

### Fase 5 — Polish (1 settimana)
- [ ] Dashboard statistiche (dati BC aggregati)
- [ ] Tab Teams per canale reparto
- [ ] Firma email dinamica
- [ ] Test end-to-end con MS365 sandbox

---

## Appendice: Stack tecnologico consigliato

| Layer | Tecnologia |
|---|---|
| Frontend | React 19 + Vite (esistente) |
| Auth browser | MSAL.js 3.x (@azure/msal-browser) |
| Backend API | Node.js + Express (o Azure Functions serverless) |
| Auth backend | MSAL Node (@azure/msal-node) + Client Credentials |
| Graph client | @microsoft/microsoft-graph-client |
| Bot SDK | Bot Framework SDK v4 (botbuilder) |
| BC client | axios + OData query builder |
| Test | Vitest (esistente) + nock per mock HTTP |
| Deploy | GitHub Pages (frontend) + Azure App Service / Functions (backend) |

---

> **Nota:** Questo documento è una specifica di progettazione. Nessuna delle integrazioni descritte è ancora implementata nel codice. Il file serve come riferimento per lo sviluppo futuro e per allineare le aspettative tra sviluppatore e stakeholder.

*Documento generato da IgelDev — 19 giugno 2026*
