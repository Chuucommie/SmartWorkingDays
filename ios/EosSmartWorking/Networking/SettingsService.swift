import Foundation

// MARK: - Settings Service
@MainActor
class SettingsService: ObservableObject {
    private let tursoUrl = Secrets.tursoUrl
    private let tursoToken = Secrets.tursoToken
    private lazy var client = TursoClient(url: tursoUrl, token: tursoToken)
    
    func loadUserProfile(userId: String) async -> UserProfile? {
        do {
            let rows = try await client.execute(
                "SELECT employee_id, email, display_name, location_code, department FROM user_settings WHERE user_id = ?",
                args: [userId]
            )
            guard let row = rows.first else { return nil }
            return UserProfile(
                employeeId: row["employee_id"] as? String ?? userId,
                email: row["email"] as? String ?? "",
                displayName: row["display_name"] as? String ?? "",
                locationCode: row["location_code"] as? String ?? "",
                department: row["department"] as? String ?? "IT"
            )
        } catch {
            return nil
        }
    }
    
    func saveUserProfile(userId: String, email: String, displayName: String, locationCode: String, department: String) async -> OperationResult {
        do {
            let existing = try await client.execute(
                "SELECT user_id FROM user_settings WHERE user_id = ?",
                args: [userId]
            )
            
            let now = ISO8601DateFormatter().string(from: Date())
            
            if !existing.isEmpty {
                try await client.execute(
                    "UPDATE user_settings SET display_name = ?, location_code = ?, department = ?, updated_at = ? WHERE user_id = ?",
                    args: [displayName, locationCode, department, now, userId]
                )
            } else {
                try await client.execute(
                    "INSERT INTO user_settings (user_id, employee_id, email, display_name, location_code, department, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    args: [userId, userId, email, displayName, locationCode, department, now, now]
                )
            }
            return OperationResult(success: true, error: nil)
        } catch {
            return OperationResult(success: false, error: error.localizedDescription)
        }
    }
}
