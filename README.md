# SmartWorkingDays

Calcolatore giorni di smart working basato sull'accordo aziendale del 60% delle ore lavorate settimanalmente.

## 🔗 Live Demo

**[https://Chuucommie.github.io/SmartWorkingDays/](https://Chuucommie.github.io/SmartWorkingDays/)**

## 📐 Logica di Calcolo

| Giorni Lavorati | Calcolo (60%) | Giorni SW |
|:---:|:---:|:---:|
| 5 | 3,0 | **3,0** |
| 4 | 2,4 | **2,5** |
| 3 | 1,8 | **2,0** |
| 2 | 1,2 | **1,0** |
| 1 | 0,6 | **0,0** |

## 🎨 Design

- UI Apple-style con glass effect, pill shapes e gradienti verdi
- Selettore giorni interattivo con toggle ufficio/casa
- Animazioni fluide e feedback visivo immediato
- Responsive, ottimizzato mobile e desktop

## 🛠️ Stack

- **React 19** + Vite + **TypeScript**
- **Tailwind CSS v4**
- **gh-pages** per deployment su GitHub Pages

## 🔧 Backend

L'app supporta **tre modalità di backend**, selezionabili via `config.ts`:

| Modalità | Flag | Descrizione |
|---|---|---|
| **Mock** (default) | `bcIntegration: false`, `githubBackend: false` | Dati fittizi in memoria, per sviluppo |
| **GitHub JSON** | `githubBackend: true` | File `data/plans.json` nel repo come database condiviso. Zero server. |
| **Business Central** | `bcIntegration: true` | Chiamate OData a BC (richiede tenant configurato) |

### Backend GitHub (consigliato per team)

1. Crea un [GitHub Personal Access Token](https://github.com/settings/tokens) con scope `repo`
2. In `src/modules/shared/config.ts`, imposta:
   ```ts
   features: { githubBackend: true },
   github: {
     token: 'ghp_xxxxxxxxxxxx',  // Il tuo PAT
     owner: 'Chuucommie',
     repo: 'SmartWorkingDays',
     branch: 'main',
     plansPath: 'data/plans.json',
   }
   ```
3. Ogni membro del team usa il **proprio token** — le pianificazioni vengono lette/scritte via GitHub API sul file `data/plans.json` condiviso
4. La Git history fa da audit log naturale

## 🚀 Sviluppo Locale

```bash
npm install
npm run dev
```

## 📦 Deploy

```bash
npm run deploy
```
