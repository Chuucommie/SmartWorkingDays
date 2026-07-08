import Foundation

// MARK: - DayState
enum DayState: String, Codable, CaseIterable {
    case free, sw, office, absent, half
    
    var icon: String {
        switch self {
        case .free: return "◌"
        case .sw: return "🏠"
        case .office: return "🏢"
        case .absent: return "✕"
        case .half: return "◐"
        }
    }
    
    var label: String {
        switch self {
        case .free: return "Libero"
        case .sw: return "SW"
        case .office: return "Ufficio"
        case .absent: return "Assenza"
        case .half: return "Misto"
        }
    }
}

typealias WeekPlan = [DayState]

// MARK: - SwRule
struct SwRule: Codable {
    let type: String   // "percentage" o "fixed"
    let value: Int
}

// MARK: - AuthUser
struct AuthUser: Codable {
    let id: String
    let email: String
    let name: String
    let department: String
    let locationCode: String
}

// MARK: - Session
struct Session: Codable {
    let userId: String
    let email: String
    let name: String
    let department: String
    let locationCode: String
    let token: String
}

// MARK: - Permutation
struct Permutation: Identifiable {
    let id = UUID()
    let week: WeekPlan
    let totalSW: Double
    let totalOffice: Double
    let valid: Bool
    let adherence: Double
}

// MARK: - TeamMember
struct TeamMember: Identifiable {
    let id = UUID()
    let employeeId: String
    let employeeName: String
    let locationCode: String
    let week: WeekPlan
    let swDaysRequested: Int
}

// MARK: - UserProfile
struct UserProfile: Codable {
    let employeeId: String
    let email: String
    let displayName: String
    let locationCode: String
    let department: String
}

// MARK: - Results
struct OperationResult {
    let success: Bool
    let error: String?
}

struct AuthResult {
    let success: Bool
    let user: AuthUser?
    let error: String?
}

struct ResetResult {
    let success: Bool
    let token: String?
    let error: String?
}
