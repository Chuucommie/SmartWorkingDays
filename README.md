# EOS Smart Working — Android

App Android nativa in **Kotlin + Jetpack Compose** per la pianificazione smart working del team EOS.

## Requisiti

- Android Studio Hedgehog (2024.1+) o superiore
- JDK 17
- Android SDK 35

## Setup

1. Clona il branch:
```bash
git clone git@github.com:Chuucommie/SmartWorkingDays.git -b android-kotlin
```

2. Apri la cartella `android/` con Android Studio (File → Open)

3. Android Studio scaricherà automaticamente il Gradle wrapper e le dipendenze

4. Esegui su emulatore o dispositivo (min SDK 26 = Android 8.0)

## Struttura

```
android/
├── build.gradle.kts          # Root build (plugin versions)
├── settings.gradle.kts       # Project settings
├── gradle.properties         # JVM args
├── gradle/wrapper/           # Gradle wrapper
└── app/
    ├── build.gradle.kts      # App dependencies
    └── src/main/
        ├── AndroidManifest.xml
        ├── res/values/       # strings, themes
        └── java/com/eos/smartworking/
            ├── EosApp.kt              # Application
            ├── MainActivity.kt         # Entry + NavGraph
            ├── model/Models.kt         # Data classes
            ├── data/                   # Repository + API
            │   ├── TursoApi.kt         # HTTP client Turso
            │   ├── AuthRepository.kt   # Login/register
            │   ├── PlansRepository.kt  # CRUD planning
            │   ├── SettingsRepository.kt
            │   └── EmailService.kt     # Cloudflare Worker
            ├── logic/SmartWorkingEngine.kt  # Permutazioni
            ├── util/Crypto.kt          # PBKDF2
            ├── util/DateUtils.kt
            └── ui/
                ├── theme/              # Material 3 + colori EOS
                ├── auth/               # Login/Register
                ├── planner/            # Pianificazione SW
                ├── team/               # Vista team
                └── settings/           # Impostazioni
```

## Backend

L'app usa lo stesso backend **Turso** (SQLite cloud) dell'app web.
Nessuna configurazione necessaria — URL e token sono hardcodati in `TursoApi.kt`.
