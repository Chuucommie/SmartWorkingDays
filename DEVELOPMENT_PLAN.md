# Piano di Sviluppo — SmartWorkingDays v3

## Panoramica

Due modifiche architetturali maggiori:

1. **Regole SW personalizzate per utente** — ogni utente Microsoft autenticato ha la propria regola (non più 60% hardcoded)
2. **Combinazioni flessibili** — il target SW è un *massimo*, non un vincolo rigido; sono valide tutte le combinazioni con SW ≤ target

---

## 1. Regole personalizzate per utente

### 1.1 Stato attuale

```typescript
// config.ts — hardcoded
export const DEFAULT_CONFIG: AppConfig = {
  swPercentage: 60,
  // ...
};
```

La percentuale 60% è fissa per tutti. Non esiste autenticazione Microsoft reale (solo mock `AuthState`).

### 1.2 Stato desiderato

- L'utente fa login con account Microsoft (MSAL / OAuth2)
- Il sistema recupera la regola SW associata a quell'utente
- La regola può essere espressa in due forme:
  - **Percentuale** (es. 60% → 3 SW su 5 giorni)
  - **Giorni fissi** (es. "2 giorni SW a settimana")
- Altri utenti hanno regole diverse

### 1.3 Modello dati

```typescript
// Nuovo: userProfile.ts

interface SwRule {
  type: 'percentage' | 'fixed';
  value: number;  // per 'percentage': 60 = 60%, per 'fixed': 2 = 2 giorni
}

interface UserProfile {
  msId: string;           // Microsoft user ID (oid claim)
  displayName: string;
  email: string;
  swRule: SwRule;
  department?: string;
}
```

### 1.4 Calcolo del target

```typescript
function computeTarget(rule: SwRule, workingDays: number): { targetSW: number; targetOffice: number } {
  if (rule.type === 'percentage') {
    const raw = (rule.value / 100) * workingDays;
    // Arrotondamento 60% già esistente (5→3.0, 4→2.5, 3→2.0, 2→1.0, 1→0.0)
    const targetSW = round60(raw);
    return { targetSW, targetOffice: workingDays - targetSW };
  } else {
    // fixed: es. 2 giorni SW fissi
    const targetSW = Math.min(rule.value, workingDays);
    return { targetSW, targetOffice: workingDays - targetSW };
  }
}
```

### 1.5 Autenticazione Microsoft

**Stack consigliato**: MSAL.js (@azure/msal-browser) + Microsoft Graph API

```
Flusso:
1. App carica → verifica sessione esistente
2. Se non autenticato → pulsante "Accedi con Microsoft"
3. MSAL popup/redirect → token ID + access
4. Dal token ID: oid (user ID), displayName, email
5. Graph API /me → department, manager (opzionale)
6. Lookup regola SW: API backend o config locale mappata per utente
```

**Configurazione Azure AD**:
- App Registration con redirect URI `https://chuucommie.github.io/SmartWorkingDays/`
- Scope: `openid profile email User.Read`
- PKCE flow per SPA

### 1.6 Lookup regole — strategia

**Opzione A — Config file statico** (semplice, per pochi utenti):
```typescript
const USER_RULES: Record<string, SwRule> = {
  'oid-ricardo': { type: 'percentage', value: 60 },
  'oid-collega1': { type: 'fixed', value: 2 },
  'oid-collega2': { type: 'percentage', value: 40 },
};
```

**Opzione B — API backend** (scalabile, per team):
```
GET /api/user/{oid}/sw-rule → { type: 'percentage', value: 60 }
```
Backend leggerebbe da database aziendale (BC, SQL, etc.)

**Raccomandazione**: iniziare con Opzione A (config statico), con interfaccia pronta per Opzione B.

### 1.7 File da modificare/creare

| File | Azione |
|---|---|
| `src/userProfile.ts` | **NUOVO** — interfacce `SwRule`, `UserProfile`, funzione `computeTarget` |
| `src/auth.ts` | **NUOVO** — MSAL setup, login/logout, recupero profilo |
| `src/config.ts` | **MODIFICA** — rimuovere `swPercentage` hardcoded, aggiungere `USER_RULES` map |
| `src/smartworking.ts` | **MODIFICA** — `generatePermutations` accetta `SwRule` invece di `AppConfig` |
| `src/SmartWorkingApp.tsx` | **MODIFICA** — login flow, user context, regola dinamica |
| `src/components/UserBadge.tsx` | **NUOVO** — mostra nome utente + regola SW |
| `src/components/LoginButton.tsx` | **NUOVO** — pulsante MS login |
| `package.json` | **MODIFICA** — aggiungere `@azure/msal-browser` |
| `index.html` | **MODIFICA** — eventuale redirect URI handling |

---

## 2. Combinazioni flessibili (SW ≤ target)

### 2.1 Stato attuale

```typescript
// smartworking.ts — validazione esatta
if (Math.abs(totalSW - targetSW) < 0.001 && Math.abs(totalOffice - targetOffice) < 0.001) {
  results.push(permutation);
}
```

Solo combinazioni che raggiungono **esattamente** il target sono valide. Esempio: target 3 SW / 2 Ufficio → solo combinazioni con esattamente 3 SW.

### 2.2 Stato desiderato

Tutte le combinazioni con **SW ≤ target** sono valide. L'utente può scegliere di fare meno SW del richiesto.

Esempio: target 3 SW / 2 Ufficio → valide:
- 3 SW / 2 Ufficio (target pieno)
- 2 SW / 3 Ufficio (1 giorno in più in ufficio)
- 1 SW / 4 Ufficio
- 0 SW / 5 Ufficio (tutti in ufficio)

### 2.3 Nuova logica di validazione

```typescript
// Validazione flessibile
const meetsTarget = totalSW <= targetSW + epsilon;
// I giorni totali devono comunque coprire tutti i giorni lavorativi
const coversAllDays = Math.abs(totalSW + totalOffice + totalHalfSW + totalHalfOffice - workingDays) < epsilon;

if (meetsTarget && coversAllDays) {
  results.push(permutation);
}
```

### 2.4 Ordinamento risultati

Le combinazioni vanno ordinate per **gradimento decrescente**:

```
1. SW == target (ottimali — raggiungono l'obiettivo)
2. SW == target - 0.5 (quasi ottimali)
3. SW == target - 1
4. ...
N. SW == 0 (tutti in ufficio)
```

```typescript
results.sort((a, b) => b.totalSW - a.totalSW);
```

### 2.5 UI — indicatore di "aderenza"

Ogni combinazione nella lista mostra quanto aderisce al target:

```
🟢 3.0/3.0 SW — 100% aderenza
🟡 2.5/3.0 SW — 83% aderenza
🟠 2.0/3.0 SW — 67% aderenza
🔴 0.0/3.0 SW — 0% aderenza
```

Oppure più semplicemente una barra o percentuale.

### 2.6 Impatto sull'algoritmo half-day

Con la regola flessibile, l'half-day diventa ancora più utile:

- Target 2.5 SW / 1.5 Ufficio (4 giorni, 1 assenza)
- Combinazioni valide:
  - 2.5 SW (es. 2 SW + 1 half) ← target pieno
  - 2.0 SW (es. 2 SW + 0 half) ← 1 giorno in più in ufficio
  - 1.5 SW (es. 1 SW + 1 half)
  - 1.0 SW
  - 0.5 SW
  - 0.0 SW

### 2.7 File da modificare

| File | Azione |
|---|---|
| `src/smartworking.ts` | **MODIFICA** — validazione `totalSW <= targetSW`, ordinamento |
| `src/smartworking.test.ts` | **MODIFICA** — nuovi test per combinazioni sub-target |
| `src/SmartWorkingApp.tsx` | **MODIFICA** — indicatore aderenza nella lista combinazioni |
| `src/styles.css` | **MODIFICA** — stili per indicatore aderenza |

---

## 3. Piano di implementazione

### Fase 1 — Regole personalizzate (3-4 giorni)

| Step | Descrizione | Priorità |
|---|---|---|
| 1.1 | Creare `userProfile.ts` con interfacce e `computeTarget` | Alta |
| 1.2 | Modificare `config.ts`: rimuovere hardcode, aggiungere `USER_RULES` map | Alta |
| 1.3 | Installare e configurare `@azure/msal-browser` | Alta |
| 1.4 | Creare `auth.ts` con MSAL setup (clientId da .env) | Alta |
| 1.5 | Creare `LoginButton.tsx` e `UserBadge.tsx` | Media |
| 1.6 | Modificare `SmartWorkingApp.tsx`: user context, login flow | Alta |
| 1.7 | Modificare `smartworking.ts`: accettare `SwRule` parametro | Alta |
| 1.8 | Aggiornare test | Alta |
| 1.9 | Aggiornare documentazione | Media |

### Fase 2 — Combinazioni flessibili (1-2 giorni)

| Step | Descrizione | Priorità |
|---|---|---|
| 2.1 | Modificare validazione in `smartworking.ts` (`<=` invece di `==`) | Alta |
| 2.2 | Aggiungere ordinamento per SW decrescente | Alta |
| 2.3 | Aggiungere indicatore aderenza nella UI | Media |
| 2.4 | Aggiornare test con casi sub-target | Alta |
| 2.5 | Aggiornare documentazione | Media |

### Fase 3 — Integrazione e deploy (1 giorno)

| Step | Descrizione |
|---|---|
| 3.1 | Test end-to-end con MSAL in ambiente dev |
| 3.2 | Build produzione |
| 3.3 | Deploy GitHub Pages |
| 3.4 | Verifica post-deploy |

---

## 4. Considerazioni tecniche

### 4.1 MSAL in GitHub Pages

- Redirect URI deve essere `https://chuucommie.github.io/SmartWorkingDays/`
- GitHub Pages non supporta server-side routing → usare `redirectUri` esatto, non wildcard
- PKCE flow funziona nativamente in SPA

### 4.2 Variabili d'ambiente

```env
VITE_MS_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_MS_AUTHORITY=https://login.microsoftonline.com/common
VITE_MS_REDIRECT_URI=https://chuucommie.github.io/SmartWorkingDays/
```

Vite le espone come `import.meta.env.VITE_MS_CLIENT_ID`.

### 4.3 Performance

- Con regola flessibile, il numero di combinazioni valide aumenta significativamente
- Per 5 giorni liberi: 3^5 = 243 permutazioni totali, la maggior parte saranno valide
- L'ordinamento è O(n log n) sui risultati filtrati — accettabile
- Considerare paginazione o virtual scrolling se > 100 risultati

### 4.4 Compatibilità backward

- Utenti non autenticati: mostrare UI con regola di default? O richiedere login?
- **Raccomandazione**: richiedere login per usare l'app; senza login mostrare solo landing page

---

## 5. Test plan

### 5.1 Test algoritmo

```
describe('Flexible target (SW <= target)', () => {
  test('all office is valid', () => {
    // target 3 SW, 5 giorni → 0 SW deve essere valido
  });
  test('partial SW is valid', () => {
    // target 3 SW → 2 SW deve essere valido
  });
  test('exact target still valid', () => {
    // target 3 SW → 3 SW valido
  });
  test('exceeding target is invalid', () => {
    // target 3 SW → 4 SW NON valido
  });
  test('results sorted by SW descending', () => {
    // primo risultato deve avere SW più alto
  });
  test('half-day with flexible target', () => {
    // target 2.5 SW, 4 giorni → 2.0 SW valido, 2.5 SW valido
  });
});
```

### 5.2 Test autenticazione

```
describe('MSAL auth', () => {
  test('login redirects to Microsoft', ...);
  test('token acquisition', ...);
  test('user profile extraction from ID token', ...);
  test('rule lookup by oid', ...);
});
```

### 5.3 Test UI

```
describe('UserBadge', () => {
  test('shows display name and SW rule', ...);
});
describe('LoginButton', () => {
  test('renders login button when not authenticated', ...);
});
describe('Adherence indicator', () => {
  test('shows 100% for exact match', ...);
  test('shows 67% for 2/3 SW', ...);
});
```

---

## 6. Riepilogo modifiche file

| File | Fase | Tipo |
|---|---|---|
| `src/userProfile.ts` | 1 | NUOVO |
| `src/auth.ts` | 1 | NUOVO |
| `src/components/LoginButton.tsx` | 1 | NUOVO |
| `src/components/UserBadge.tsx` | 1 | NUOVO |
| `src/config.ts` | 1 | MODIFICA |
| `src/smartworking.ts` | 1+2 | MODIFICA |
| `src/SmartWorkingApp.tsx` | 1+2 | MODIFICA |
| `src/smartworking.test.ts` | 1+2 | MODIFICA |
| `src/styles.css` | 2 | MODIFICA |
| `package.json` | 1 | MODIFICA |
| `index.html` | 1 | MODIFICA |
| `.env.example` | 1 | NUOVO |
| `README.md` | 3 | MODIFICA |
| `TECHNICAL.md` | 3 | MODIFICA |

---

## 7. Domande aperte per l'utente

1. **Lookup regole**: Opzione A (config statico) o Opzione B (API backend)? Per iniziare consiglio A.
2. **Utenti non autenticati**: Bloccare l'accesso o mostrare una regola di default?
3. **Regola fissa "2 giorni"**: I 2 giorni sono un massimo o un obbligo? Con la flessibilità, "massimo 2" significa 0, 1, o 2 SW validi.
4. **Indicatore aderenza**: Semplice (percentuale) o colorato (🟢🟡🟠🔴)?
5. **Priorità**: Iniziare con Fase 1 (regole) o Fase 2 (flessibilità)? Sono indipendenti.
