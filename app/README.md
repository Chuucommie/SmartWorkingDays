# SmartWorkingDays — App Native

App native complete per iOS (SwiftUI) e Android (Jetpack Compose) che replicano
integralmente la web app SmartWorkingDays.

## Struttura

```
app/
├── ios/
│   ├── Package.swift
│   └── SmartWorkingDays/
│       ├── App.swift                    # Entry point + TabView
│       ├── Models/Models.swift          # Modelli dati condivisi
│       ├── Engine/Engine.swift          # Logica pura (SW engine, Timesheet engine)
│       ├── ViewModels/ViewModels.swift  # MVVM ViewModels
│       └── Views/
│           ├── SmartWorkingView.swift   # Schermata principale Smart Working
│           ├── TimesheetView.swift      # Schermata Timesheet (lista, editor, statistiche)
│           └── SavedWeeksView.swift     # Combinazioni salvate
│
└── android/
    └── app/src/main/
        ├── AndroidManifest.xml
        └── java/com/eosprod/smartworkingdays/
            ├── MainActivity.kt          # Entry point + bottom navigation
            ├── models/Models.kt         # Modelli dati condivisi
            ├── engine/Engine.kt         # Logica pura
            └── ui/
                ├── theme/Colors.kt      # Palette Apple-inspired
                └── screens/
                    ├── SmartWorkingScreen.kt  # Smart Working
                    └── TimesheetScreen.kt     # Timesheet
```

## Funzionalità

### Smart Working
- Dropdown regola SW in alto (60%, 40%, Max 2gg, Max 3gg)
- Selettore giorni con 4 stati (Libero, SW, Ufficio, Assenza)
- Algoritmo base-3 per permutazioni con mezza giornata
- Validazione flessibile (totalSW ≤ targetSW)
- Indicatore aderenza colorato 🟢🟡🟠🔴
- Bottone "Salva combinazione" + "Rilascia settimana (crea Timesheet)"

### Timesheet
- **Lista**: elenco timesheet con filtri per stato, azioni
- **Editor**: header BC con campi in italiano + righe raggruppate per giorno
  - Campi esatti BC: Nr. risorsa, Nome risorsa, Stato, Nr. settimana,
    Data inizio, Data fine, Tipo periodo, Nr. commessa, Descrizione
  - Righe: Tipo, Nr., Descrizione, Quantità, UdM, Nr. commessa,
    Tipo lavoro, Addebitabile, Codice ubicazione
  - Righe COLLAPSABLE per giorno (Lun-Ven)
- **Statistiche**: ore totali, per giorno (bar chart), per tipo lavoro, per commessa

### Bridge SmartWorking → Timesheet
- "Rilascia settimana" crea un Timesheet in stato "In approvazione"
- Location Code = "Smart Working" per giorni SW/half
- Location Code = "BOLOGNA" per giorni office
- Quantity = 8h (4h per half)

## Tecnologie

| Piattaforma | Linguaggio | UI Framework | Target |
|---|---|---|---|
| iOS | Swift 5.9 | SwiftUI | iOS 17+ |
| Android | Kotlin | Jetpack Compose | Android 8+ |

## Build

### iOS
```bash
cd app/ios
xcodebuild -scheme SmartWorkingDays -destination 'platform=iOS Simulator,name=iPhone 15'
```

### Android
```bash
cd app/android
./gradlew assembleDebug
```
