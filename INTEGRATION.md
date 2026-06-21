# SmartWorkingDays — Integrazione con Business Central, Teams e Outlook

> **Documento di specifica tecnica e funzionale**  
> Versione: 2.0 — Giugno 2026  
> Stato: **Progettazione** (non ancora implementato)

---

## 📋 Indice

1. [Filosofia dell'integrazione](#filosofia-dellintegrazione)
2. [Panoramica del flusso](#panoramica-del-flusso)
3. [Business Central](#1-business-central)
   - [Cosa legge l'app (input)](#11-cosa-legge-lapp-da-bc)
   - [Cosa scrive l'app (output)](#12-cosa-scrive-lapp-su-bc)
   - [Architettura tecnica](#13-architettura-tecnica)
4. [Microsoft Outlook](#2-microsoft-outlook)
   - [Cosa legge l'app (input)](#21-cosa-legge-lapp-da-outlook)
   - [Cosa scrive l'app (output)](#22-cosa-scrive-lapp-su-outlook)
   - [Architettura tecnica](#23-architettura-tecnica)
5. [Microsoft Teams](#3-microsoft-teams)
   - [Cosa legge l'app (input)](#31-cosa-legge-lapp-da-teams)
   - [Cosa scrive l'app (output)](#32-cosa-scrive-lapp-su-teams)
   - [Architettura tecnica](#33-architettura-tecnica)
6. [Flusso completo](#4-flusso-completo)
7. [Impatto su UI e backend](#5-impatto-su-ui-e-backend)
8. [Considerazioni di sicurezza](#6-considerazioni-di-sicurezza)
9. [Roadmap implementativa](#7-roadmap-implementativa)

---

## Filosofia dell'integrazione

> **SmartWorkingDays è l'orchestratore, non il gregario.**

L'app non dipende da nessun sistema esterno per le sue regole o la sua logica. La regola del 60%, le mappe SW/Ufficio, il motore di permutazioni — tutto è **interno e autonomo**.

Il ruolo dell'app nell'ecosistema Microsoft 365 è duplice:

### 🔵 INPUT — L'app raccoglie dati per aiutare l'utente

L'app **legge** da BC, Outlook e Teams informazioni già esistenti sulla settimana dell'utente, e le usa per **pre-compilare i vincoli** nella UI. L'utente vede subito quali giorni sono già "bloccati" da impegni esterni e può decidere di conseguenza.

| Fonte | Cosa legge | Effetto nella UI |
|---|---|---|
| **Outlook** | Eventi calendario (ferie, permessi, meeting in sede) | Giorni pre-impostati come Assenza o Ufficio |
| **Teams** | Riunioni pianificate nella settimana | Giorni con riunioni in sede → pre-impostati Ufficio |
| **Business Central** | Timesheet / registrazioni presenza già inserite | Giorni già rendicontati → pre-impostati come SW/Ufficio/Assenza |

### 🟢 OUTPUT — L'app scrive i risultati dove servono

Dopo che l'utente ha impostato quanti giorni SW vuole fare, scelto una permutazione e confermato, l'app **scrive** la pianificazione verso i sistemi che ne hanno bisogno.

| Destinazione | Cosa scrive | Effetto |
|---|---|---|
| **Outlook** | Eventi "Smart Working" sul calendario | I colleghi vedono che quel giorno sei in SW |
| **Teams** | Notifica al canale del team / manager | Il team sa chi è in ufficio e chi in SW |
| **Business Central** | Pianificazione SW nella tabella custom | HR/reporting hanno i dati aggregati |

### ❌ Cosa l'app NON fa

- **NON** dipende da policy lette da BC — la regola 60% è hardcodata nell'app (modificabile via config)
- **NON** avvia workflow di approvazione — l'app scrive dati, l'approvazione è un processo separato
- **NON** invia email automatiche non richieste — solo notifiche Teams e scrittura eventi Outlook
- **NON** è un bot Teams che sostituisce la UI — la UI React rimane l'interfaccia primaria

---

## Panoramica del flusso

```
                        SmartWorkingDays
                        ═══════════════════
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐          ┌─────────┐          ┌─────────┐
    │ Outlook │          │  Teams  │          │   BC    │
    │ (Graph) │          │ (Graph) │          │ (OData) │
    └─────────┘          └─────────┘          └─────────┘
         │                    │                    │
         │  eventi            │  riunioni           │  timesheet
         │  calendario        │  pianificate        │  presenze
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  PRE-COMPILAZIONE │
                    │  dei 5 giorni     │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  UTENTE IMPOSTA   │
                    │  "Voglio X SW"    │
                    │  + aggiusta giorni│
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  APP CALCOLA      │
                    │  permutazioni     │
                    │  (motore interno) │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  UTENTE SCEGLIE   │
                    │  e CONFERMA       │
                    └──────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐          ┌─────────┐          ┌─────────┐
    │ Outlook │          │  Teams  │          │   BC    │
    │ eventi  │          │ notifica│          │ planning│
    │ SW      │          │ canale  │          │ salvata │
    └─────────┘          └─────────┘          └─────────┘
```

---

## 1. Business Central

### 1.1 Cosa legge l'app da BC

L'app interroga BC per recuperare **dati già esistenti** sull'utente, e li usa per pre-compilare la settimana.

| Dato letto | Endpoint BC (OData) | Mapping nella UI |
|---|---|---|
| **Timesheet della settimana** — giorni già registrati come lavorati/assenti | `GET /companies({id})/employees({employeeId})/timeRegistrationEntries?$filter=date ge {monday} and date le {friday}` | Se un giorno ha timbratura → `office` (l'utente era in sede). Se assenza registrata → `absent`. |
| **Pianificazioni SW precedenti** — settimane già pianificate dall'utente | `GET /companies({id})/customTable_SWPlanning?$filter=employeeNo eq '{id}' and weekStart eq '{monday}'` | Se esiste già una pianificazione per quella settimana → pre-compila TUTTI i 5 giorni con i valori salvati. L'utente può modificarli. |
| **Ferie/permessi approvati** — assenze già autorizzate in BC | `GET /companies({id})/employees({employeeId})/absenceRegistrations?$filter=date ge {monday} and date le {friday}` | Giorni con assenza approvata → `absent` (non modificabile, o modificabile con warning) |

**Regola di pre-compilazione (priorità decrescente):**
1. Se BC ha un'assenza approvata → giorno = `absent` (bloccato)
2. Se BC ha una timbratura/ufficio → giorno = `office`
3. Se BC ha già una pianificazione SW salvata → giorno = valore salvato
4. Altrimenti → giorno = `free`

### 1.2 Cosa scrive l'app su BC

Dopo la conferma dell'utente, l'app salva la pianificazione in BC.

| Dato scritto | Endpoint BC (OData) | Contenuto |
|---|---|---|
| **Pianificazione SW settimanale** | `POST /companies({id})/customTable_SWPlanning` | I 5 giorni (Lun-Ven) con stato `sw`/`office`/`absent`, data inizio settimana, employee ID |
| **Aggiornamento pianificazione** | `PATCH /companies({id})/customTable_SWPlanning({entryId})` | Se l'utente modifica una settimana già pianificata |

**Nota:** L'app NON gestisce workflow di approvazione. La tabella custom in BC può essere configurata dall'amministratore BC per triggerare un workflow, ma questa è logica lato BC, non lato app.

### 1.3 Architettura tecnica

#### Autenticazione
```
OAuth 2.0 con Microsoft Entra ID (Azure AD)
├── App Registration in Azure Portal
├── Delegated permissions: BC API access (user impersonation)
├── Token refresh automatico via MSAL.js (lato browser)
└── Scope: https://api.businesscentral.dynamics.com/.default
```

#### Endpoint BC usati (solo lettura + scrittura pianificazione)

| Operazione | Metodo | Endpoint |
|---|---|---|
| Leggi timesheet | `GET` | `/companies({id})/employees({employeeId})/timeRegistrationEntries?$filter=date ge {start} and date le {end}` |
| Leggi assenze | `GET` | `/companies({id})/employees({employeeId})/absenceRegistrations?$filter=date ge {start} and date le {end}` |
| Leggi pianificazione esistente | `GET` | `/companies({id})/customTable_SWPlanning?$filter=employeeNo eq '{id}' and weekStart eq '{date}'` |
| Salva pianificazione | `POST` | `/companies({id})/customTable_SWPlanning` |
| Aggiorna pianificazione | `PATCH` | `/companies({id})/customTable_SWPlanning({entryId})` |

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
        field(9; "SW Days Requested"; Integer) { Caption = 'Giorni SW richiesti dall utente'; }
        field(10; "Submitted At"; DateTime) { }
        field(11; "Notes"; Text[250]) { }
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
```

**Nota:** Rimosso l'enum `SW Approval Status` e i campi `Submitted By`/`Approved By` — l'app non gestisce approvazioni. Aggiunto campo `SW Days Requested` per tracciare quanti giorni SW l'utente aveva chiesto.

#### Modulo backend previsto: `src/businessCentral.js`

```javascript
// Funzioni di LETTURA (input per pre-compilazione)
fetchTimesheetWeek(employeeId, weekStart)    → GET OData timeRegistrationEntries
fetchAbsencesWeek(employeeId, weekStart)     → GET OData absenceRegistrations
fetchExistingPlanning(employeeId, weekStart) → GET OData customTable_SWPlanning

// Funzioni di SCRITTURA (output dopo conferma)
savePlanning(employeeId, weekPlan, swDaysRequested) → POST OData customTable_SWPlanning
updatePlanning(entryId, weekPlan)                   → PATCH OData customTable_SWPlanning

// Funzione di pre-compilazione (pura, testabile)
prefillDayStates(timesheet, absences, existingPlan) → ['free','sw','office','absent'][]
```

---

## 2. Microsoft Outlook

### 2.1 Cosa legge l'app da Outlook

L'app interroga il calendario Outlook dell'utente tramite Microsoft Graph e mappa gli eventi in vincoli per i giorni della settimana.

| Dato letto | Endpoint Graph | Mapping nella UI |
|---|---|---|
| **Eventi calendario** (ferie, permessi, meeting) | `GET /me/calendar/calendarView?startDateTime={monday}&endDateTime={friday}` | Eventi analizzati per tipo |
| **Out of office automatico** | `GET /me/mailboxSettings/automaticRepliesSetting` | Se OOO attivo nella settimana → tutti i giorni `absent` |

#### Regole di mapping eventi → stato giorno

| Condizione evento | Stato giorno | Note |
|---|---|---|
| `showAs === "oof"` (out of office) | `absent` | Ferie/permesso — giorno bloccato |
| Categoria "Ferie", "Permesso", "Assenza" | `absent` | Bloccato |
| `showAs === "busy"` + location contiene "Ufficio"/"Sede" | `office` | Meeting in presenza |
| `showAs === "busy"` + isOnlineMeeting = true | `office` | Riunione Teams — vedi sezione Teams |
| Evento "Smart Working" (creato dall'app in passato) | `sw` | Pianificazione precedente |
| Nessun evento rilevante | `free` | Libero |

**Regola di precedenza tra Outlook e BC:**
- Se Outlook dice `absent` (ferie) → vince su tutto, giorno bloccato
- Se Outlook dice `office` (meeting in sede) → vince su BC timesheet
- Se Outlook non ha eventi → vale il dato BC

### 2.2 Cosa scrive l'app su Outlook

Dopo la conferma, l'app crea eventi sul calendario Outlook per i giorni SW.

| Dato scritto | Endpoint Graph | Contenuto |
|---|---|---|
| **Evento "Smart Working"** per ogni giorno SW | `POST /me/calendar/events` | Evento all-day, showAs="workingElsewhere", categoria "Smart Working" |
| **Rimozione eventi SW precedenti** (se modifica) | `DELETE /me/calendar/events/{eventId}` | Cancella vecchi eventi SW della stessa settimana prima di crearne di nuovi |

#### Payload evento SW su Outlook

```json
{
  "subject": "🏠 Smart Working",
  "body": {
    "contentType": "HTML",
    "content": "Giorno di Smart Working pianificato tramite SmartWorkingDays.<br>Settimana del {weekStart}."
  },
  "start": { "dateTime": "2026-06-23T00:00:00", "timeZone": "Europe/Rome" },
  "end": { "dateTime": "2026-06-23T23:59:00", "timeZone": "Europe/Rome" },
  "isAllDay": true,
  "showAs": "workingElsewhere",
  "categories": ["Smart Working"],
  "sensitivity": "normal",
  "reminderMinutesBeforeStart": 0
}
```

**Nota:** L'app NON invia email. La notifica ai colleghi avviene tramite:
1. Evento su calendario (visibile a chi ha accesso al calendario dell'utente)
2. Notifica Teams (vedi sezione Teams)

### 2.3 Architettura tecnica

#### Microsoft Graph API

```
Endpoint base: https://graph.microsoft.com/v1.0
Auth: OAuth 2.0 (stesso token Entra ID, scope aggiuntivi)
Scope necessari: Calendars.ReadWrite, MailboxSettings.Read
```

#### Endpoint Graph usati

| Operazione | Metodo | Endpoint |
|---|---|---|
| Leggi eventi settimana | `GET` | `/me/calendar/calendarView?startDateTime={start}&endDateTime={end}&$select=subject,start,end,showAs,categories,location,isOnlineMeeting` |
| Leggi OOO status | `GET` | `/me/mailboxSettings/automaticRepliesSetting` |
| Crea evento SW | `POST` | `/me/calendar/events` |
| Cancella evento SW | `DELETE` | `/me/calendar/events/{eventId}` |
| Cerca eventi SW esistenti | `GET` | `/me/calendar/events?$filter=categories/any(c:c+eq+'Smart Working') and start/dateTime ge '{monday}' and end/dateTime le '{friday}'` |

#### Modulo backend previsto: `src/outlookCalendar.js`

```javascript
// Funzioni di LETTURA (input per pre-compilazione)
fetchCalendarWeek(startDate)              → GET Graph calendarView
fetchOutOfOffice()                        → GET Graph mailboxSettings
mapEventsToDayStates(events, oooStatus)   → ['free','sw','office','absent'][] (pura)

// Funzioni di SCRITTURA (output dopo conferma)
clearExistingSWEvents(weekStart)          → DELETE eventi SW esistenti nella settimana
createSWEvents(weekPlan, weekStart)       → POST evento per ogni giorno SW
```

---

## 3. Microsoft Teams

### 3.1 Cosa legge l'app da Teams

L'app interroga il calendario Teams dell'utente (che è lo stesso calendario Outlook/Exchange, ma filtrato per riunioni online) per rilevare meeting che richiedono presenza in ufficio.

| Dato letto | Endpoint Graph | Mapping nella UI |
|---|---|---|
| **Riunioni online della settimana** | `GET /me/calendar/calendarView?$filter=isOnlineMeeting eq true` | Se la riunione ha location "Ufficio"/"Sede" o se l'utente ha una policy Teams che richiede presenza → giorno `office` |
| **Presenza Teams (opzionale)** | `GET /me/presence` (solo al momento dell'uso) | Informazione in tempo reale: se l'utente è già in ufficio secondo Teams |

**Nota pratica:** Le riunioni Teams sono già coperte dalla lettura del calendario Outlook (stesso backend Exchange). La sezione Teams per l'INPUT serve principalmente a:
1. Identificare riunioni ibride (online + in presenza) che Outlook da solo non distinguerebbe
2. Leggere la presenza Teams come conferma in tempo reale

#### Regole aggiuntive per riunioni Teams

| Condizione | Stato giorno |
|---|---|
| Riunione Teams con tag "Presenza obbligatoria" o location fisica | `office` |
| Riunione Teams senza requisiti di presenza | `free` (l'utente può fare SW anche se ha una call) |
| Giorno con 3+ riunioni Teams consecutive | `office` (suggerito, non bloccato) |

### 3.2 Cosa scrive l'app su Teams

Dopo la conferma, l'app notifica il team tramite Teams.

| Dato scritto | Meccanismo | Contenuto |
|---|---|---|
| **Notifica pianificazione** | Graph `POST /teams/{teamId}/channels/{channelId}/messages` | Messaggio nel canale del team: "Ricardo ha pianificato: 3 SW, 2 Ufficio questa settimana" |
| **Scheda riepilogativa settimanale** (opzionale) | Stesso endpoint, formato Adaptive Card | Card con i 5 giorni colorati per ogni membro del team |
| **Notifica modifica** | Stesso endpoint | "Ricardo ha aggiornato la pianificazione: ora 2 SW, 3 Ufficio" |

#### Payload notifica Teams (messaggio semplice)

```json
{
  "body": {
    "contentType": "html",
    "content": "<p><strong>Ricardo Quintero</strong> ha pianificato la settimana del 23/06:</p><p>🏠 Lun SW · 🏢 Mar Ufficio · 🏢 Mer Ufficio · 🏠 Gio SW · 🏠 Ven SW</p><p><em>3 giorni Smart Working, 2 giorni Ufficio</em></p>"
  }
}
```

#### Payload Adaptive Card riepilogativa (opzionale, per canale team)

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "Pianificazione SW — Settimana 23/06",
      "weight": "Bolder",
      "size": "Large"
    },
    {
      "type": "ColumnSet",
      "columns": [
        {
          "type": "Column",
          "items": [
            { "type": "TextBlock", "text": "Ricardo", "weight": "Bolder" },
            { "type": "TextBlock", "text": "🏠 Lun · 🏢 Mar · 🏢 Mer · 🏠 Gio · 🏠 Ven" },
            { "type": "TextBlock", "text": "3 SW · 2 Ufficio", "isSubtle": true }
          ]
        }
        // ... altri membri del team
      ]
    }
  ]
}
```

**Nota:** L'app NON è un bot conversazionale. Non risponde a comandi chat. La notifica è unidirezionale: app → canale Teams. L'interfaccia utente rimane la web app React.

### 3.3 Architettura tecnica

#### Microsoft Graph API (per Teams)

```
Scope aggiuntivi: Teamwork.ReadWrite (o ChannelMessage.Send se disponibile)
Endpoint: POST /teams/{teamId}/channels/{channelId}/messages
```

**Limitazione attuale di Graph:** L'invio di messaggi a canali Teams tramite Graph ha scope ristretti (application permissions, non delegated). Alternative:
1. **Graph API con application permissions** — richiede admin consent sul tenant
2. **Incoming Webhook** — URL webhook configurato nel canale Teams, l'app fa POST HTTP semplice
3. **Bot Framework** — overkill per notifiche unidirezionali

**Consigliato: Incoming Webhook.** L'amministratore Teams configura un webhook nel canale, l'app riceve l'URL e lo usa per inviare messaggi.

#### Endpoint usati

| Operazione | Metodo | Endpoint |
|---|---|---|
| Leggi riunioni online | `GET` | `/me/calendar/calendarView?$filter=isOnlineMeeting eq true` (già coperto da Outlook) |
| Invia notifica canale | `POST` | `{webhookUrl}` (Incoming Webhook) |
| Invia Adaptive Card | `POST` | `{webhookUrl}` con body Adaptive Card |

#### Modulo backend previsto: `src/teamsNotify.js`

```javascript
// Funzioni di LETTURA (input per pre-compilazione)
fetchOnlineMeetingsWithLocation(startDate) → GET Graph calendarView filtrato
mapTeamsMeetingsToConstraints(meetings)    → ['free','office'][] (pura)

// Funzioni di SCRITTURA (output dopo conferma)
notifyChannel(webhookUrl, message)         → POST Incoming Webhook (testo semplice)
notifyChannelCard(webhookUrl, card)         → POST Incoming Webhook (Adaptive Card)
buildWeeklySummaryCard(teamPlans)           → genera Adaptive Card riepilogativa (pura)
```

---

## 4. Flusso completo

### Scenario reale: l'utente pianifica la settimana

```
L'UTENTE APRE L'APP
│
├── [1] LOGIN MICROSOFT (OAuth PKCE)
│   ├── Token Entra ID ottenuto
│   └── Scope: BC API + Graph (Calendar, Teams)
│
├── [2] RACCOLTA DATI (INPUT — in parallelo)
│   ├── GET BC timesheet → Lun=timbrato, Mar=timbrato, Mer=vuoto, Gio=vuoto, Ven=vuoto
│   ├── GET BC assenze → nessuna assenza questa settimana
│   ├── GET BC pianificazione esistente → nessuna (prima volta)
│   ├── GET Outlook calendarView → Mer 10-12: meeting "Q2 Review" in sede
│   ├── GET Outlook OOO → non attivo
│   └── GET Teams riunioni → Mer: riunione Teams (già vista via Outlook)
│
├── [3] PRE-COMPILAZIONE UI
│   ├── Lun: office (timbrato in BC)
│   ├── Mar: office (timbrato in BC)
│   ├── Mer: office (meeting in sede — Outlook vince su BC vuoto)
│   ├── Gio: free (nessun dato)
│   └── Ven: free (nessun dato)
│
├── [4] UTENTE IMPOSTA L'OBIETTIVO
│   ├── "Questa settimana voglio fare 2 giorni di Smart Working"
│   ├── I target SW/Ufficio si aggiornano: 3.0 SW, 2.0 Ufficio (regola 60% su 5gg)
│   ├── Giorni già fissati: Lun=office, Mar=office, Mer=office → 3 office fissi
│   ├── Giorni liberi: Gio, Ven → 2 giorni da assegnare
│   └── L'utente può forzare un giorno (es. cambiare Mer da office a free se il meeting è saltato)
│
├── [5] APP CALCOLA PERMUTAZIONI (motore interno)
│   ├── 2 giorni liberi → 2^2 = 4 permutazioni totali
│   ├── Target: 3.0 SW, 2.0 Office
│   ├── Fixed: 3 Office → servono 0 SW e 0 Office dai liberi? Impossibile.
│   └── L'app mostra: "⚠️ Troppi giorni fissati in Ufficio. Libera almeno 1 giorno."
│
├── [6] UTENTE AGGIUSTA
│   ├── Cambia Mar da office a free (il timbrato BC era di un'altra settimana)
│   ├── Ora: Lun=office, Mar=free, Mer=office, Gio=free, Ven=free
│   ├── 3 giorni liberi → 2^3 = 8 permutazioni
│   ├── Target: 3.0 SW, 2.0 Office. Fixed: 2 Office → servono 3 SW e 0 Office dai liberi
│   └── 1 permutazione valida: Mar=SW, Gio=SW, Ven=SW
│
├── [7] UTENTE CONFERMA
│   └── Clicca "Conferma pianificazione"
│
├── [8] SCRITTURA (OUTPUT — in parallelo)
│   ├── POST BC /customTable_SWPlanning → salva pianificazione
│   ├── DELETE Outlook eventi SW vecchi della settimana (se esistono)
│   ├── POST Outlook /me/calendar/events × 3 → eventi SW per Mar, Gio, Ven
│   └── POST Teams webhook → notifica canale: "Ricardo: 3 SW, 2 Ufficio"
│
└── [9] FEEDBACK ALL'UTENTE
    ├── Toast verde: "Pianificazione salvata ✅"
    ├── Badge su ogni giorno: 🏠 SW / 🏢 Ufficio / ✕ Assenza
    └── Link: "Apri Outlook" / "Apri Teams"
```

---

## 5. Impatto su UI e backend

### 5.1 UI — Modifiche previste

| Elemento UI | Descrizione |
|---|---|
| **Pulsante "Login Microsoft"** | In alto a destra. Avvia OAuth PKCE flow. Mostra avatar/nome utente dopo login |
| **Banner "Dati importati"** | Sotto l'header: "📅 Dati importati da Outlook, Teams e BC" con data ultimo sync |
| **Pulsante "Importa dati"** | Ricarica i dati dalle 3 fonti e ri-pre-compila i giorni. Con spinner durante il fetch |
| **Badge su ogni giorno** | Oltre allo stato (SW/Ufficio/Assenza/Libero), un piccolo badge che indica la FONTE del vincolo: "📅 Outlook", "⏱️ BC", "💬 Teams", "✋ Manuale" |
| **Giorni bloccati** | I giorni con assenza (ferie Outlook o assenza BC) hanno un lucchetto 🔒 e non sono cliccabili |
| **Selettore "Giorni SW desiderati"** | Nuovo controllo: l'utente imposta quanti giorni SW vuole fare (es. "2"). L'app ricalcola i target e mostra se è possibile |
| **Pulsante "Conferma e invia"** | Salva su BC, crea eventi Outlook, notifica Teams — tutto con un clic |
| **Toast feedback** | Notifica temporanea: "Salvato su BC ✅ · Eventi Outlook creati ✅ · Teams notificato ✅" |
| **Sezione "Riepilogo invio"** | Mini-tabella che mostra lo stato dell'invio alle 3 destinazioni |

### 5.2 Backend — Nuovi moduli

```
src/
├── smartworking.js          # Logica pura (esistente, invariata)
├── smartworking.test.js     # 51 test (esistenti, invariati)
├── App.jsx                  # UI React (da modificare)
├── index.css                # Stili (da estendere)
│
├── msAuth.js                # NUOVO: MSAL.js PKCE flow, token storage in memoria
├── msAuth.test.js           # Test auth flow
│
├── dataImport.js            # NUOVO: orchestratore import dati (chiama i 3 moduli sotto)
├── dataImport.test.js       # Test orchestrazione import
│
├── businessCentral.js       # NUOVO: fetch timesheet/assenze/planning, save/update planning
├── businessCentral.test.js  # Test con mock OData
│
├── outlookCalendar.js       # NUOVO: fetch eventi/OOO, map eventi→stati, create/delete eventi SW
├── outlookCalendar.test.js # Test con mock Graph
│
├── teamsNotify.js           # NUOVO: fetch riunioni online, invia notifiche webhook
├── teamsNotify.test.js      # Test con mock Graph/Webhook
│
└── prefillEngine.js         # NUOVO: logica pura di pre-compilazione (priorità fonti)
    prefillEngine.test.js    # Test esaustivi delle regole di merging
```

### 5.3 Configurazione

```javascript
// config.ts (nuovo file, modificabile senza rebuild)
export const APP_CONFIG = {
  // Regola smart working (modificabile per azienda)
  swRatio: 0.6,                        // 60%
  swDaysMap: { 5: 3.0, 4: 2.5, 3: 2.0, 2: 1.0, 1: 0.0, 0: 0.0 },
  officeDaysMap: { 5: 2.0, 4: 1.5, 3: 1.0, 2: 1.0, 1: 1.0, 0: 0.0 },

  // Fonti dati — quali attivare
  sources: {
    outlook: true,    // Importa eventi calendario
    teams: true,      // Importa riunioni Teams
    businessCentral: true,  // Importa timesheet/assenze
  },

  // Destinazioni output — quali attivare
  outputs: {
    outlook: true,    // Crea eventi SW su calendario
    teams: true,      // Notifica canale Teams
    businessCentral: true,  // Salva pianificazione
  },

  // Teams webhook URL (configurato dall'amministratore)
  teamsWebhookUrl: '',

  // BC company ID (configurato dall'amministratore)
  bcCompanyId: '',
};
```

---

## 6. Considerazioni di sicurezza

| Aspetto | Soluzione |
|---|---|
| **Auth** | OAuth 2.0 PKCE (browser). Token in memoria (variabile JS), MAI in localStorage/sessionStorage. Refresh automatico via MSAL.js |
| **API key** | Nessuna API key nel frontend. Il Teams webhook URL è l'unico "segreto" ed è configurabile dall'amministratore |
| **CORS** | L'app chiama direttamente Graph e BC OData dal browser (no backend intermedio). CORS gestito da Microsoft |
| **Rate limit** | Graph: throttling lato client con retry-after. BC OData: caching in memoria (1 minuto) per evitare chiamate duplicate |
| **Dati sensibili** | Employee ID, email → in memoria, mai in URL. Logging solo in development mode |
| **GDPR** | L'app non memorizza dati personali (solo in memoria durante la sessione). I dati persistono solo nei sistemi Microsoft (BC, Outlook, Teams) già conformi |
| **Tenant isolation** | Single-tenant. L'App Registration in Azure è legata a un tenant specifico |

---

## 7. Roadmap implementativa

### Fase 1 — Auth + Config (1-2 settimane)
- [ ] App Registration su Azure (Entra ID) con scope BC + Graph
- [ ] Modulo `src/msAuth.js` con MSAL.js (PKCE flow, token in memoria)
- [ ] Bottone "Login Microsoft" nella UI
- [ ] File `config.ts` con toggle fonti/destinazioni
- [ ] Test auth flow

### Fase 2 — Import dati (2-3 settimane)
- [ ] Modulo `src/outlookCalendar.js` — fetch eventi, mapping
- [ ] Modulo `src/teamsNotify.js` — fetch riunioni online
- [ ] Modulo `src/businessCentral.js` — fetch timesheet, assenze, planning esistente
- [ ] Modulo `src/prefillEngine.js` — logica pura di merging con priorità
- [ ] Modulo `src/dataImport.js` — orchestratore (chiama i 3, passa a prefillEngine)
- [ ] UI: banner "Dati importati", badge fonte su ogni giorno, giorni bloccati
- [ ] Test per ogni modulo con mock API

### Fase 3 — Output (2 settimane)
- [ ] `businessCentral.js` — savePlanning, updatePlanning
- [ ] `outlookCalendar.js` — clearExistingSWEvents, createSWEvents
- [ ] `teamsNotify.js` — notifyChannel, notifyChannelCard
- [ ] UI: pulsante "Conferma e invia", toast feedback, sezione riepilogo invio
- [ ] Test output con mock API

### Fase 4 — Selettore "Giorni SW desiderati" (1 settimana)
- [ ] UI: nuovo controllo per impostare quanti giorni SW l'utente vuole
- [ ] Logica: ricalcolo target, validazione fattibilità
- [ ] Test

### Fase 5 — Polish (1-2 settimane)
- [ ] Gestione errori API (retry, messaggi utente comprensibili)
- [ ] Offline mode: se API non raggiungibili, l'app funziona in modalità manuale
- [ ] Configurazione amministratore (webhook URL, company ID) via pannello settings
- [ ] Test end-to-end con tenant Microsoft 365 di test

---

## Appendice: Stack tecnologico

| Layer | Tecnologia |
|---|---|
| Frontend | React 19 + Vite (esistente) |
| Auth browser | MSAL.js 3.x (@azure/msal-browser) |
| Graph client | @microsoft/microsoft-graph-client |
| BC client | axios + OData query builder (puro, nessuna libreria BC specifica) |
| Test | Vitest (esistente) + nock per mock HTTP |
| Deploy | GitHub Pages (frontend only — nessun backend server) |

**Perché nessun backend server:** L'app chiama le API Microsoft direttamente dal browser (OAuth PKCE + CORS gestito da Microsoft). Non servono server intermedi. Il Teams webhook è una semplice POST HTTP. Questo mantiene l'architettura semplice e riduce i costi.

---

> **Nota:** Questo documento è una specifica di progettazione. Nessuna delle integrazioni descritte è ancora implementata nel codice. Il file serve come riferimento per lo sviluppo futuro.

*Documento generato da IgelDev — 19 giugno 2026 · Versione 2.0*
