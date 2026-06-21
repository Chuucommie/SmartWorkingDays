# EOS Timesheet — Documentazione Funzionale

> **Guida per l'utente finale**  
> Versione: 3.0 — Giugno 2026  
> App live: [https://Chuucommie.github.io/SmartWorkingDays/](https://Chuucommie.github.io/SmartWorkingDays/)

---

## 📋 Indice

1. [Cos'è EOS Timesheet](#cosè-eos-timesheet)
2. [Dashboard](#dashboard)
3. [Modulo Smart Working](#modulo-smart-working)
   - [Pianificare la settimana](#pianificare-la-settimana)
   - [Combinazioni salvate](#combinazioni-salvate)
   - [Vista team](#vista-team)
   - [Notifiche cambi stato](#notifiche-cambi-stato)
4. [Modulo Timesheet](#modulo-timesheet)
5. [Integrazioni future](#integrazioni-future)

---

## Cos'è EOS Timesheet

EOS Timesheet è l'applicazione per la gestione delle presenze e dello smart working di EOS Prod. Attualmente include:

- **🏠 Smart Working** — Pianifica i tuoi giorni di smart working, visualizza il team, ricevi notifiche
- **⏱️ Timesheet** — Registrazione ore su Business Central (in sviluppo)

L'app è una **SPA React** accessibile da qualsiasi browser, senza installazione. I dati sono salvati in locale (localStorage) e, in futuro, sincronizzati con Business Central.

---

## Dashboard

La Dashboard è la schermata iniziale. Mostra una card per ogni modulo disponibile:

| Modulo | Stato | Descrizione |
|---|---|---|
| 🏠 Smart Working | **Attivo** | Pianifica SW, vedi team, ricevi notifiche |
| ⏱️ Timesheet | In sviluppo | Registra ore su BC EOS Prod |
| 📊 Report | In sviluppo | Statistiche mensili, export Excel |

Clicca su una card attiva per accedere al modulo. Le card "In sviluppo" mostrano un'anteprima delle funzionalità previste.

---

## Modulo Smart Working

### Pianificare la settimana

1. Apri **Smart Working** dalla Dashboard o dalla navbar
2. Per ogni giorno (Lun-Ven), clicca per cambiare stato:
   - **◌ Libero** — giorno da assegnare (SW o Ufficio)
   - **🏠 SW Fisso** — giorno bloccato come Smart Working
   - **🏢 Ufficio** — giorno bloccato in ufficio
   - **✕ Assenza** — giorno di assenza (ferie, permesso)
3. L'app calcola automaticamente:
   - Giorni lavorati (escludendo le assenze)
   - Target SW e Ufficio in base alla regola del **60%**
   - Tutte le combinazioni possibili per i giorni liberi
4. **Combinazioni valide** sono mostrate di default. Usa il toggle **"+N non valide"** per vedere tutte le combinazioni
5. Clicca su una combinazione per selezionarla (bordo verde)
6. Usa i link in fondo alla pagina per navigare alle altre sezioni

#### Regola del 60%

| Giorni lavorati | Giorni SW | Giorni Ufficio |
|---|---|---|
| 5 | 3.0 | 2.0 |
| 4 | 2.5 | 1.5 |
| 3 | 2.0 | 1.0 |
| 2 | 1.0 | 1.0 |
| 1 | 0.0 | 1.0 |
| 0 | 0.0 | 0.0 |

---

### Combinazioni salvate

Puoi salvare una configurazione settimanale come **template** per riutilizzarla in futuro.

#### Salvare una combinazione
1. Configura i giorni come desideri
2. Torna alla pagina **Combinazioni salvate** (link `💾 Combinazioni salvate`)
3. Clicca **Salva questa settimana** (funzione disponibile prossimamente direttamente dalla pagina SW)
4. Dai un nome al template (es. "Settimana tipo standard")

#### Gestire i template
- **Carica**: applica il template alla pianificazione corrente
- **Rinomina**: doppio clic sul nome o pulsante ✏️
- **Elimina**: pulsante 🗑
- **Esporta**: scarica tutti i template in un file JSON (backup)
- **Importa**: carica template da un file JSON

**Limite:** massimo 20 template salvati.

---

### Vista team

La pagina **👥 Vedi team** mostra le pianificazioni SW dei colleghi del tuo stesso dipartimento e sede.

#### Cosa vedi
- **Riga "Tu"**: la tua pianificazione, evidenziata in verde
- **Righe colleghi**: nome, 5 giorni con icona stato, conteggio SW
- **Badge coincidenze** 👥+N: nei giorni in cui sei in ufficio, mostra quanti colleghi sono anch'essi in ufficio. Passa il mouse per vedere i nomi
- **Navigazione settimana**: pulsanti `← Prec.` e `Succ. →` per cambiare settimana

#### Seguire un collega
Nella colonna **Segui**, clicca `Segui` per attivare le notifiche per quel collega. Il pulsante diventa `✓ Seguito`.

---

### Notifiche cambi stato

Quando segui dei colleghi, ricevi notifiche se modificano la loro pianificazione SW.

#### Come funziona
- L'app controlla automaticamente ogni **5 minuti** le pianificazioni dei colleghi che segui
- Se un collega cambia anche un solo giorno, appare una notifica
- La campanella 🔔 nella navbar mostra un **badge rosso** con il numero di notifiche non lette
- Clicca la campanella per aprire il dropdown e leggere i dettagli
- Le notifiche mostrano: nome del collega, ora del cambiamento, giorni modificati (es. "Lun: SW → Ufficio")

#### Limiti
- Massimo **15 colleghi** seguiti
- Le notifiche funzionano solo quando l'app è aperta
- Ritardo massimo: 5 minuti

---

## Modulo Timesheet

Il modulo Timesheet è in sviluppo. Permetterà di:

- 📝 Registrare le ore lavorate giornalmente
- 📊 Visualizzare riepiloghi settimanali e mensili
- 📤 Esportare dati in Excel
- 🔄 Sincronizzare con Business Central EOS Prod

---

## Integrazioni future

L'app è progettata per integrarsi con l'ecosistema Microsoft 365. Quando i riferimenti agli ambienti saranno configurati, sarà possibile:

| Integrazione | Cosa farà |
|---|---|
| **Business Central** | Salvare pianificazioni SW su BC, leggere timesheet e presenze |
| **Outlook** | Importare eventi calendario (ferie, meeting), creare eventi SW |
| **Teams** | Notificare il canale del team quando qualcuno pianifica |

Per attivare le integrazioni, configurare i valori in `APP_CONFIG` (file `src/modules/shared/config.ts`).

---

*Documento generato da IgelDev — 19 giugno 2026*
