import Foundation

// MARK: - Auth Service
@MainActor
class AuthService: ObservableObject {
    private let tursoUrl = Secrets.tursoUrl
    private let tursoToken = Secrets.tursoToken
    private lazy var client = TursoClient(url: tursoUrl, token: tursoToken)
    
    private let sessionKey = "eos-session"
    
    // MARK: - Session (Keychain-like via UserDefaults per semplicità)
    func saveSession(_ session: Session) {
        if let data = try? JSONEncoder().encode(session) {
            UserDefaults.standard.set(data, forKey: sessionKey)
        }
    }
    
    func loadSession() -> Session? {
        guard let data = UserDefaults.standard.data(forKey: sessionKey) else { return nil }
        return try? JSONDecoder().decode(Session.self, from: data)
    }
    
    func clearSession() {
        UserDefaults.standard.removeObject(forKey: sessionKey)
    }
    
    var isLoggedIn: Bool { loadSession() != nil }
    
    // MARK: - Auth operations
    func register(email: String, password: String, name: String, department: String, locationCode: String) async -> AuthResult {
        do {
            let existing = try await client.execute("SELECT id FROM users WHERE email = ?", args: [email])
            if !existing.isEmpty { return AuthResult(success: false, user: nil, error: "Email già registrata") }
            
            let id = Crypto.generateUserId()
            let salt = Crypto.generateSalt()
            let passwordHash = Crypto.hashPassword(password, salt: salt)
            let now = ISO8601DateFormatter().string(from: Date())
            
            try await client.execute(
                "INSERT INTO users (id, email, password_hash, name, department, location_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                args: [id, email, "\(salt):\(passwordHash)", name, department, locationCode, now, now]
            )
            
            let user = AuthUser(id: id, email: email, name: name, department: department, locationCode: locationCode)
            return AuthResult(success: true, user: user, error: nil)
        } catch {
            return AuthResult(success: false, user: nil, error: error.localizedDescription)
        }
    }
    
    func login(email: String, password: String) async -> AuthResult {
        do {
            let rows = try await client.execute(
                "SELECT id, email, password_hash, name, department, location_code FROM users WHERE email = ?",
                args: [email]
            )
            guard let row = rows.first else { return AuthResult(success: false, user: nil, error: "Email non trovata") }
            
            guard let storedHash = row["password_hash"] as? String else {
                return AuthResult(success: false, user: nil, error: "Dati utente corrotti")
            }
            let parts = storedHash.split(separator: ":")
            guard parts.count >= 2 else { return AuthResult(success: false, user: nil, error: "Dati utente corrotti") }
            
            let salt = String(parts[0])
            let hash = String(parts[1])
            let computedHash = Crypto.hashPassword(password, salt: salt)
            guard computedHash == hash else { return AuthResult(success: false, user: nil, error: "Password errata") }
            
            let user = AuthUser(
                id: row["id"] as? String ?? "",
                email: row["email"] as? String ?? "",
                name: row["name"] as? String ?? "",
                department: (row["department"] as? String) ?? "IT",
                locationCode: (row["location_code"] as? String) ?? "MILANO"
            )
            return AuthResult(success: true, user: user, error: nil)
        } catch {
            return AuthResult(success: false, user: nil, error: error.localizedDescription)
        }
    }
    
    func requestPasswordReset(email: String) async -> ResetResult {
        do {
            let rows = try await client.execute("SELECT id FROM users WHERE email = ?", args: [email])
            if rows.isEmpty { return ResetResult(success: false, token: nil, error: "Email non trovata") }
            
            let token = Crypto.generateResetToken()
            let expires = ISO8601DateFormatter().string(from: Date().addingTimeInterval(3600))
            let now = ISO8601DateFormatter().string(from: Date())
            
            try await client.execute(
                "INSERT OR REPLACE INTO password_resets (email, token, expires_at, created_at) VALUES (?, ?, ?, ?)",
                args: [email, token, expires, now]
            )
            return ResetResult(success: true, token: token, error: nil)
        } catch {
            return ResetResult(success: false, token: nil, error: error.localizedDescription)
        }
    }
    
    func resetPassword(email: String, token: String, newPassword: String) async -> AuthResult {
        do {
            let rows = try await client.execute(
                "SELECT token, expires_at FROM password_resets WHERE email = ? AND token = ?",
                args: [email, token]
            )
            guard let row = rows.first else { return AuthResult(success: false, user: nil, error: "Token non valido") }
            
            if let expiresStr = row["expires_at"] as? String,
               let expires = ISO8601DateFormatter().date(from: expiresStr),
               expires < Date() {
                try? await client.execute("DELETE FROM password_resets WHERE email = ?", args: [email])
                return AuthResult(success: false, user: nil, error: "Token scaduto")
            }
            
            let salt = Crypto.generateSalt()
            let passwordHash = Crypto.hashPassword(newPassword, salt: salt)
            let now = ISO8601DateFormatter().string(from: Date())
            
            try await client.execute(
                "UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?",
                args: ["\(salt):\(passwordHash)", now, email]
            )
            try await client.execute("DELETE FROM password_resets WHERE email = ?", args: [email])
            return AuthResult(success: true, user: nil, error: nil)
        } catch {
            return AuthResult(success: false, user: nil, error: error.localizedDescription)
        }
    }
    
    func changeEmail(userId: String, newEmail: String, currentPassword: String) async -> OperationResult {
        do {
            let rows = try await client.execute(
                "SELECT id, email, password_hash FROM users WHERE id = ?",
                args: [userId]
            )
            guard let row = rows.first else { return OperationResult(success: false, error: "Utente non trovato") }
            
            guard let storedHash = row["password_hash"] as? String else {
                return OperationResult(success: false, error: "Dati utente corrotti")
            }
            let parts = storedHash.split(separator: ":")
            guard parts.count >= 2 else { return OperationResult(success: false, error: "Dati utente corrotti") }
            
            let salt = String(parts[0])
            let hash = String(parts[1])
            let computedHash = Crypto.hashPassword(currentPassword, salt: salt)
            guard computedHash == hash else { return OperationResult(success: false, error: "Password attuale errata") }
            
            let oldEmail = row["email"] as? String ?? ""
            if newEmail != oldEmail {
                let existing = try await client.execute("SELECT id FROM users WHERE email = ?", args: [newEmail])
                if !existing.isEmpty { return OperationResult(success: false, error: "Email già in uso") }
            }
            
            let now = ISO8601DateFormatter().string(from: Date())
            try await client.execute(
                "UPDATE users SET email = ?, updated_at = ? WHERE id = ?",
                args: [newEmail, now, userId]
            )
            
            if var session = loadSession() {
                session = Session(userId: session.userId, email: newEmail, name: session.name, department: session.department, locationCode: session.locationCode, token: session.token)
                saveSession(session)
            }
            
            return OperationResult(success: true, error: nil)
        } catch {
            return OperationResult(success: false, error: error.localizedDescription)
        }
    }
}
