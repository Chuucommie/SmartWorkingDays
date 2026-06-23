# Project Mimosa — Security, Best Practices, Vulnerability & Technical/Functional Report

> **Repository**: `Chuucommie/projectMimosa_Kotlin`  
> **Version**: 1.2.0 (June 2026)  
> **Stack**: Kotlin Multiplatform (KMP) + Swift/SwiftUI (iOS) + Jetpack Compose (Android, partial)  
> **Backend**: Appwrite self-hosted (REST API)  
> **Review Date**: 20 June 2026

---

## 1. Executive Summary

Project Mimosa is a well-architected **academic classroom app** connecting teachers and students via announcements, study materials, assignments, flashcards, and reactions. The iOS implementation is **feature-complete and production-ready**, while the Android side is **~80% stubbed**. The codebase is clean, well-documented, and follows KMP best practices.

**Critical issues found**: 2 (API key in binary, cleartext HTTP everywhere)  
**High issues found**: 3 (weak seed passwords, no input sanitization, Android stubs)  
**Medium issues found**: 5 (no rate limiting, no cert pinning, synthetic email generation, public storage reads, no CI/CD)

---

## 2. Security Assessment

### 2.1 🔴 CRITICAL — API Key Hardcoded in Compiled Binary

**File**: `sharedLogic/src/iosMain/kotlin/com/project/mimosa/BackendActuals.kt:83`

```kotlin
private val apiKey = "standard_b82bcbbde57da4f130d596abbb3de5dd5422746517aa4bc2a542b53ce3f516d30121cf2cbd347d2e1415d25ecb5bc89f639eab4a03139175893f7ca8ef74f8ae8a6c2bd56261a2537e08d1492ea65a8574a32ef0aefc0f70e37951628c2e2d285afac6b52756f65860a3b3256dce5ad79150854025a58d25cc0a6166eb7981d9"
```

This is a **server-side API key** with full database/storage access. It is compiled into the iOS binary and can be extracted via:
- `strings` command on the IPA
- Jailbreak + runtime introspection
- Decompilation of the KMP framework

**The same key appears in 5 Python scripts** in the repo:
- `setup_appwrite.py` (line 9)
- `seed_data.py` (line 8)
- `scratch/reset_passwords.py` (line 5)
- `scratch/add_feedback_collection.py` (line 7)
- `check_database_content.py`
- `fix_teacher_role.py`

**Risk**: Anyone with this key can read/write/delete all database records, all user accounts, and all stored files. This is a **full backend compromise**.

**Recommendation**: 
- Move all server-side operations to a **proxy/backend service** that holds the API key server-side
- The client should authenticate with **user session tokens only**
- Rotate the exposed API key immediately
- Remove the key from all Python scripts; use environment variables

---

### 2.2 🔴 CRITICAL — Cleartext HTTP Allowed (No TLS)

**iOS** (`iosApp/iosApp/Info.plist:7-11`):
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

**Android** (`androidApp/src/main/AndroidManifest.xml:11-12`):
```xml
android:usesCleartextTraffic="true"
android:networkSecurityConfig="@xml/network_security_config"
```

**Android network_security_config.xml**:
```xml
<domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">192.168.1.128</domain>
    <domain includeSubdomains="true">10.0.2.2</domain>
    <domain includeSubdomains="true">localhost</domain>
    <domain includeSubdomains="true">172.20.10.6</domain>
</domain-config>
```

**Risk**: All traffic to the Appwrite backend (`http://192.168.1.128:9090`) is unencrypted HTTP. Session cookies, passwords during login, and all data are transmitted in cleartext. Any device on the same LAN can **passively sniff credentials and session tokens**.

**Recommendation**:
- Configure HTTPS on the Appwrite instance (Let's Encrypt or self-signed + cert pinning)
- Remove `NSAllowsArbitraryLoads` before App Store submission
- Use `NSExceptionDomains` to allow only the specific backend domain with minimum necessary exceptions
- Android: restrict cleartext to `10.0.2.2` (emulator only), remove production IPs

---

### 2.3 🟡 HIGH — Weak Seed Passwords

**File**: `seed_data.py:99-101`
```python
create_auth_user(TEACHER_ID, TEACHER_EMAIL, "Password123", TEACHER_NAME)
for s_id, _, _ in students_info:
    create_auth_user(s_id, f"{s_id}@mimosa.local", "Password123", s_id)
```

All 31 seed users (1 teacher + 30 students) share the **identical password `Password123`**. This is for development seeding, but if the seed script is ever run against a production-accessible instance, it creates a massive account takeover surface.

**Recommendation**: Generate random per-user passwords in seed scripts, or add a `--production` flag that refuses to run with weak defaults.

---

### 2.4 🟡 HIGH — No Input Validation/Sanitization on Client

The iOS SwiftUI layer passes user input directly to the backend without client-side validation:
- Comment content (no length check before API call)
- Review text (no length check)
- Announcement title/content (no length check)
- Material descriptions (no length check)

The backend (Appwrite) enforces attribute size limits, but the client should **validate before sending** to provide immediate user feedback and reduce backend load.

**Recommendation**: Add client-side validation matching the Appwrite attribute size limits (e.g., comment max 2000 chars, review max 1000 chars).

---

### 2.5 🟡 MEDIUM — Synthetic Email Generation for Student ID Login

**File**: `iosApp/iosApp/AuthView.swift:243-246`
```swift
var loginEmail = email.trimmingCharacters(in: .whitespaces)
if !loginEmail.contains("@") {
    loginEmail = "\(loginEmail)@mimosa.local"
}
```

Students can log in with just a **student ID** (no `@`), and the app auto-appends `@mimosa.local`. This means:
- Student `student_05` logs in as `student_05@mimosa.local`
- Anyone who knows another student's ID can attempt to log in as them
- No email verification exists

**Recommendation**: Require full email addresses or implement a proper student ID → email mapping on the backend.

---

### 2.6 🟡 MEDIUM — Public Read Access on Storage Buckets

**File**: `setup_appwrite.py:112`
```python
"permissions": ["read(\"any\")", "create(\"users\")", "update(\"users\")", "delete(\"users\")"]
```

The `avatars` and `materials` buckets have **public read access**. While avatars being public is acceptable, **study materials (PDFs) are also publicly readable** by anyone who knows the file ID. This may be intentional (educational materials), but should be a conscious decision.

**Recommendation**: If materials should be restricted to authenticated classroom members, change permissions to `read("users")`.

---

### 2.7 🟢 GOOD — Keychain Security

**File**: `iosApp/iosApp/KeychainHelper.swift:62`
```swift
kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
```

Credentials are stored with the **most restrictive accessibility flag**, meaning they are:
- Only accessible when the device is unlocked
- Not included in iCloud Keychain sync
- Not included in iTunes/iCloud backups
- Protected by the Secure Enclave (AES-256)

This is **best-in-class iOS credential storage**.

---

### 2.8 🟢 GOOD — Biometric Authentication

**File**: `iosApp/iosApp/AuthView.swift:207-233`

Face ID / Touch ID is properly implemented using `LocalAuthentication` framework with:
- `LAContext.canEvaluatePolicy()` pre-check
- Proper `LAError` handling
- User-facing reason string in Info.plist

---

## 3. Best Practices Assessment

### 3.1 ✅ Architecture

| Practice | Status | Notes |
|----------|--------|-------|
| KMP shared logic | ✅ Excellent | `expect`/`actual` pattern for platform abstraction |
| Interface-based design | ✅ Excellent | `BackendInterfaces.kt` defines clean contracts |
| `@Throws` for Swift interop | ✅ Good | Swift can catch KMP exceptions as `Error` |
| Singleton services | ✅ Good | `IosAppwriteService`, `IosDatabaseManager` as singletons |
| Separation of concerns | ✅ Good | Auth, Database, UI clearly separated |

### 3.2 ✅ Documentation

| Document | Quality | Notes |
|----------|---------|-------|
| `README.md` | Basic | KMP template, needs project-specific content |
| `FUNCTIONAL_DOCS.md` | **Excellent** | Complete feature list, user flows, navigation map |
| `TECHNICAL_DOCS.md` | **Excellent** | Architecture diagrams, schema, build instructions, test coverage |
| `handover.md` | Good | Handover notes for new developers |
| `DEVELOPMENT_PLAN.md` (in SmartWorkingDays) | N/A | Different project |

### 3.3 ✅ Testing

| Layer | Tests | Coverage |
|-------|-------|----------|
| iOS Unit | 10 tests | Theme, models, Keychain, notifications, avatar compression |
| iOS Integration | 8 tests | Feed fetch, comments, reactions, materials, reviews, CRUD, session |
| KMP Common | 2 test files | `SharedLogicCommonTest.kt`, `SharedUICommonTest.kt` |
| Android Host | 1 test file | `SharedLogicAndroidHostTest.kt` |

**22 documented tests** with good coverage of critical paths. Integration tests hit the live Appwrite backend.

### 3.4 ✅ Code Quality

| Aspect | Rating | Notes |
|--------|--------|-------|
| Naming conventions | ✅ Good | Consistent Kotlin/Swift idioms |
| Error handling | ✅ Good | Structured try-catch with user-facing messages |
| JSON parsing | ⚠️ Manual | `BackendActuals.kt` has 400+ lines of manual JSON mapping; `kotlinx.serialization` could reduce this |
| Magic strings | ⚠️ Some | Collection IDs, bucket IDs, endpoint URLs scattered |
| Dead code | ⚠️ Some | `new.sh`, `new2.sh` shell scripts in `androidMain/` |

### 3.5 ⚠️ Missing

| Practice | Status | Recommendation |
|----------|--------|----------------|
| CI/CD pipeline | ❌ Missing | Add GitHub Actions for build + test on PR |
| Dependency auditing | ❌ Missing | Run `gradle dependencies` audit + OWASP check |
| Code coverage reports | ❌ Missing | Integrate JaCoCo/Kover |
| Linting | ❌ Missing | Add ktlint/detekt for Kotlin, SwiftLint for Swift |
| `.env` for secrets | ❌ Missing | API key should never be in source files |
| Rate limiting | ❌ Missing | No client-side debounce on reactions/comments |
| Offline support | ❌ Missing | No local caching; app is fully network-dependent |

---

## 4. Vulnerability Assessment

### 4.1 Vulnerability Matrix

| # | Vulnerability | Severity | Exploitability | Impact |
|---|-------------|----------|---------------|--------|
| V1 | API key in binary | 🔴 Critical | Trivial (strings dump) | Full backend compromise |
| V2 | Cleartext HTTP | 🔴 Critical | Trivial (LAN sniffing) | Credential theft, session hijacking |
| V3 | Weak seed passwords | 🟡 High | Low (dev-only) | Account takeover if seeded in prod |
| V4 | No input sanitization | 🟡 High | Medium | XSS in web views, backend pollution |
| V5 | Synthetic email login | 🟡 Medium | Medium | Unauthorized access to other student accounts |
| V6 | Public material reads | 🟡 Medium | Low | Unauthorized document access |
| V7 | No certificate pinning | 🟡 Medium | Medium (with TLS) | MITM even with HTTPS |
| V8 | Hardcoded IP addresses | 🟢 Low | Low | Breakage on network change |
| V9 | No session timeout | 🟢 Low | Low | Stale sessions persist indefinitely |

### 4.2 Attack Scenarios

**Scenario A — Decompiled App Attack**:
1. Attacker downloads the IPA from a jailbroken device
2. Runs `strings` on the binary → extracts API key
3. Uses the key to read all user emails, delete materials, or create admin accounts
4. **Impact**: Total backend compromise

**Scenario B — Coffee Shop WiFi Attack**:
1. Attacker on same WiFi as a student using Mimosa
2. Runs `tcpdump` / Wireshark in promiscuous mode
3. Captures HTTP POST to `/account/sessions/email` → extracts email + password in cleartext
4. **Impact**: Account takeover

**Scenario C — Student ID Guessing**:
1. Attacker knows the student ID format (e.g., `student_05`)
2. Enters `student_05` in the login field
3. App sends `student_05@mimosa.local` to backend
4. If password is weak/guessable → unauthorized access
5. **Impact**: Account takeover

---

## 5. Technical Assessment

### 5.1 Architecture Diagram

```
┌──────────────────────────────────────────────┐
│              iOS SwiftUI App                  │
│  AuthView · FeedView · MaterialsView          │
│  SettingsView · ContentView · FlashcardViews  │
│  AssignmentsView · PostDetailView             │
├──────────────────────────────────────────────┤
│         KMP Shared Logic (Kotlin)             │
│  BackendInterfaces.kt (abstract contracts)    │
│  BackendActuals.kt (iOS REST impl, 1551 LOC)  │
│  AndroidAppwriteService.kt (SDK impl, 79 LOC) │
│  DatabaseRepository.kt (Android stub, 318 LOC)│
├──────────────────────────────────────────────┤
│       Appwrite Backend (self-hosted)          │
│  Endpoint: http://192.168.1.128:9090/v1       │
│  Database: mimosa_v2 (13 collections)         │
│  Storage: avatars, materials, submissions     │
└──────────────────────────────────────────────┘
```

### 5.2 Platform Completeness

| Platform | Status | Notes |
|----------|--------|-------|
| **iOS** | ✅ Feature-complete | All 13 collections implemented, biometrics, notifications, full UI |
| **Android** | ⚠️ ~20% complete | Auth works (login/register/logout), Feed fetch works, Materials fetch works. **80% of DatabaseManager methods throw NotImplementedError** |
| **Shared UI (Compose)** | ⚠️ Minimal | Only `App.kt` with basic scaffolding |

### 5.3 Database Schema

| # | Collection | Documents | Key Indexes |
|---|-----------|-----------|-------------|
| 1 | `profiles` | User profiles | — |
| 2 | `studyMaterials` | Course materials | `createdAt`, `folderId` |
| 3 | `reviews` | Material ratings | `materialId` |
| 4 | `newsPosts` | Announcements | `createdAt` |
| 5 | `comments` | Post comments | `postId` |
| 6 | `reactions` | Emoji reactions | `targetId` |
| 7 | `moderationFlags` | Comment flags | — |
| 8 | `feedbacks` | App feedback | — |
| 9 | `folders` | Material folders | `createdAt` |
| 10 | `assignmentTasks` | Teacher assignments | `createdAt` |
| 11 | `assignmentSubmissions` | Student uploads | `taskId`, `studentId` |
| 12 | `flashcardDecks` | Flashcard sets | `createdAt` |
| 13 | `flashcards` | Individual cards | `deckId` |
| 14 | `flashcardProgress` | Study tracking | `deckId`, `studentId` |

**Schema quality**: Well-normalized, properly indexed, appropriate attribute types and sizes.

### 5.4 API Design

- **iOS**: Raw REST calls via Ktor `HttpClient` with manual JSON parsing
- **Android**: Appwrite SDK (`io.appwrite`) for the few implemented methods
- **Auth**: Session-based (email/password → session cookie)
- **Database ops**: Server-side API key (bypasses user permissions)

**Issue**: The iOS implementation has ~400 lines of manual `JsonObject` parsing in `BackendActuals.kt`. Using `kotlinx.serialization` with data classes would reduce this by 80% and eliminate parsing bugs.

### 5.5 Notification Architecture

| Type | Mechanism | Latency |
|------|-----------|---------|
| Student push | `Timer.publish(every: 30s)` polling + `UNTimeIntervalNotificationTrigger(0.5s)` | ~30 seconds |
| Teacher digest | Batched daily at configured time via `UNCalendarNotificationTrigger` | Daily |
| Foreground refresh | `scenePhase == .active` triggers immediate poll | Instant on return |

**Assessment**: Pragmatic polling approach works without a push server. For production at scale, consider Firebase Cloud Messaging (FCM) or APNs with a server-side push trigger.

---

## 6. Functional Assessment

### 6.1 Feature Completeness

| Feature | iOS | Android | Notes |
|---------|-----|---------|-------|
| Email/Password Auth | ✅ | ✅ | Login, register, logout |
| Biometric Auth | ✅ | ❌ | Face ID / Touch ID |
| Session Persistence | ✅ | ❌ | Auto-login via Keychain |
| Announcements Feed | ✅ | ⚠️ | Read-only on Android |
| Create/Edit/Delete Posts | ✅ | ❌ | Teacher only |
| Comments | ✅ | ❌ | Create, delete, status |
| Emoji Reactions | ✅ | ❌ | Add/remove on posts |
| Study Materials | ✅ | ⚠️ | Read-only on Android |
| Material Upload | ✅ | ❌ | PDF + web links |
| Material Rating/Review | ✅ | ❌ | 0.5–5 stars |
| Folders | ✅ | ❌ | Hierarchical with emoji/color |
| Assignments | ✅ | ❌ | Tasks + submissions + grading |
| Flashcards | ✅ | ❌ | Decks + cards + Anki-style progress |
| Push Notifications | ✅ | ❌ | Student immediate + teacher digest |
| Profile Management | ✅ | ❌ | Avatar upload with compression |
| App Feedback | ✅ | ❌ | Anonymous feedback collection |
| Comment Moderation | ✅ | ❌ | Flagging system |
| Dark/Light Theme | ✅ | ❌ | System-following |

### 6.2 User Flows

**Teacher flow**: Register → Create announcements → Upload materials → Create assignments → Grade submissions → Create flashcard decks → Receive daily digest

**Student flow**: Register → Read feed → React/comment → Download materials → Rate/review → Submit assignments → Study flashcards → Receive push notifications

Both flows are **complete and well-designed** on iOS.

### 6.3 UI/UX Notes

- **iOS**: Native SwiftUI with custom design system (`Theme.swift`), glass-morphism cards, proper dark mode support
- **Android**: Jetpack Compose with basic Material Design (only Auth + Settings screens implemented)
- **Navigation**: Tab-based (Feed, Materials, Settings) + modal sheets for detail views
- **Accessibility**: No explicit VoiceOver/TalkBack support visible

---

## 7. Recommendations — Prioritized Action Plan

### 🔴 Immediate (Before Any Production Use)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | **Move API key to proxy server** — create a thin backend service that holds the key and exposes endpoints to the client with user-session auth only | Medium | Eliminates V1 |
| 2 | **Enable HTTPS on Appwrite** — configure TLS certificate, update all endpoints to `https://` | Low | Eliminates V2 |
| 3 | **Rotate the exposed API key** — generate a new key in Appwrite console, update proxy only | Low | Contains current exposure |
| 4 | **Remove API key from all Python scripts** — use environment variables or `.env` file (gitignored) | Low | Prevents future leaks |
| 5 | **Remove `NSAllowsArbitraryLoads`** — replace with `NSExceptionDomains` for the specific backend domain only | Low | App Store compliance |

### 🟡 High Priority (Before Production Launch)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 6 | Add client-side input validation | Low | Better UX, reduced backend errors |
| 7 | Implement proper student ID → email mapping | Medium | Closes V5 |
| 8 | Add certificate pinning for HTTPS | Medium | Closes V7 |
| 9 | Review storage bucket permissions (materials) | Low | Closes V6 if needed |
| 10 | Generate random passwords in seed scripts | Low | Closes V3 |

### 🟢 Medium Priority (Post-Launch)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 11 | Complete Android implementation | Large | Platform parity |
| 12 | Add CI/CD pipeline (GitHub Actions) | Medium | Quality gate |
| 13 | Integrate ktlint + SwiftLint | Low | Code consistency |
| 14 | Add Kover code coverage reports | Low | Visibility |
| 15 | Migrate iOS JSON parsing to kotlinx.serialization | Medium | Reduce 400 LOC |
| 16 | Add offline caching (local DB) | Large | Resilience |
| 17 | Add rate limiting (client-side debounce) | Low | Prevent spam |

---

## 8. Summary Scores

| Category | Score | Rating |
|----------|-------|--------|
| **Architecture** | 8.5/10 | ✅ Excellent KMP design |
| **iOS Implementation** | 8/10 | ✅ Feature-complete, clean SwiftUI |
| **Android Implementation** | 2/10 | 🔴 Mostly stubs |
| **Security** | 4/10 | 🔴 API key in binary, cleartext HTTP |
| **Code Quality** | 7/10 | ✅ Good, some manual JSON parsing |
| **Documentation** | 9/10 | ✅ Exceptional functional + technical docs |
| **Testing** | 7/10 | ✅ Good coverage, integration tests hit live backend |
| **DevOps** | 3/10 | 🔴 No CI/CD, no linting, secrets in repo |
| **Overall** | **6.5/10** | 🟡 Good foundation, critical security gaps |

---

## 9. Conclusion

Project Mimosa is a **well-designed, thoughtfully architected** educational app with an excellent iOS implementation. The documentation is outstanding. However, it has **two critical security vulnerabilities** (hardcoded API key + cleartext HTTP) that **must be resolved before any production deployment**. The Android implementation is essentially a stub and would require significant work to reach parity.

The KMP shared logic approach is the right architectural choice — once the Android implementation is completed, both platforms will share the same business logic, reducing maintenance burden.

**Bottom line**: Production-ready for iOS after resolving the 2 critical security issues. Not production-ready for Android.

---

*Report generated by IgelDev — 20 June 2026*
