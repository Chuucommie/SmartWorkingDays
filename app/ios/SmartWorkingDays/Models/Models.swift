import Foundation

// MARK: - DayState

enum DayState: String, Codable, CaseIterable {
    case free = "free"
    case sw = "sw"
    case office = "office"
    case absent = "absent"
    case half = "half"

    var label: String {
        switch self {
        case .free: return "Libero"
        case .sw: return "SW"
        case .office: return "Ufficio"
        case .absent: return "Assenza"
        case .half: return "Misto"
        }
    }

    var icon: String {
        switch self {
        case .free: return "◌"
        case .sw: return "🏠"
        case .office: return "🏢"
        case .absent: return "✕"
        case .half: return "◐"
        }
    }

    var isWorkingDay: Bool { self != .absent }
}

typealias WeekPlan = [DayState]

// MARK: - SwRule

enum SwRuleType: String, Codable {
    case percentage
    case fixed
}

struct SwRule: Codable, Equatable {
    let type: SwRuleType
    let value: Double

    var description: String {
        switch type {
        case .percentage: return "\(Int(value))% Smart Working"
        case .fixed: return "Max \(Int(value)) giorni SW"
        }
    }

    func computeTarget(workedDays: Int) -> (targetSW: Double, targetOffice: Double) {
        switch type {
        case .percentage:
            let raw = (value / 100.0) * Double(workedDays)
            let rounded = (raw * 2).rounded() / 2
            let sw = min(rounded, Double(workedDays))
            return (sw, Double(workedDays) - sw)
        case .fixed:
            let sw = min(value, Double(workedDays))
            return (sw, Double(workedDays) - sw)
        }
    }
}

// MARK: - Permutation

struct Permutation: Identifiable {
    let id = UUID()
    let week: WeekPlan
    let totalSW: Int
    let totalOffice: Int
    let totalHalf: Int
    let valid: Bool
    let adherence: Double

    var swCount: Double { Double(totalSW) + Double(totalHalf) / 2.0 }
}

// MARK: - Timesheet Types

enum TimesheetStatus: String, Codable, CaseIterable {
    case open = "Open"
    case pendingApproval = "Pending Approval"
    case approved = "Approved"
    case rejected = "Rejected"

    var label: String {
        switch self {
        case .open: return "Aperto"
        case .pendingApproval: return "In approvazione"
        case .approved: return "Approvato"
        case .rejected: return "Respinto"
        }
    }

    var color: String {
        switch self {
        case .open: return "#007AFF"
        case .pendingApproval: return "#FF9500"
        case .approved: return "#34C759"
        case .rejected: return "#FF3B30"
        }
    }
}

enum LineType: String, Codable, CaseIterable {
    case resource = "Resource"
    case item = "Item"
    case glAccount = "G/L Account"

    var label: String {
        switch self {
        case .resource: return "Risorsa"
        case .item: return "Articolo"
        case .glAccount: return "C/G"
        }
    }
}

enum UnitOfMeasure: String, Codable, CaseIterable {
    case hours = "Hours"
    case days = "Days"

    var label: String {
        switch self {
        case .hours: return "Ore"
        case .days: return "Giorni"
        }
    }
}

struct TimesheetLine: Identifiable, Codable {
    var id: String = UUID().uuidString
    var timesheetId: String
    var lineNo: Int
    var type: LineType = .resource
    var no: String = ""
    var description: String = ""
    var quantity: Double = 0
    var unitOfMeasure: UnitOfMeasure = .hours
    var jobNo: String = ""
    var workType: String = ""
    var chargeable: Bool = true
    var locationCode: String = ""
    var dayIndex: Int = 0
}

struct TimesheetHeader: Codable {
    var id: String = UUID().uuidString
    var no: String = ""
    var resourceNo: String
    var resourceName: String
    var status: TimesheetStatus = .open
    var startingDate: String
    var endingDate: String
    var weekNo: Int
    var periodType: String = "Week"
    var jobNo: String = ""
    var description: String = ""
    var createdAt: String = ISO8601DateFormatter().string(from: Date())
    var updatedAt: String = ISO8601DateFormatter().string(from: Date())
}

struct Timesheet: Identifiable, Codable {
    var header: TimesheetHeader
    var lines: [TimesheetLine] = []

    var id: String { header.id }
}

struct DaySummary: Identifiable {
    let id = UUID()
    let dayIndex: Int
    let dayName: String
    let date: String
    var lines: [TimesheetLine]
    var totalHours: Double
}

struct TimesheetStats {
    var totalHours: Double = 0
    var byDay: [Int: Double] = [:]
    var byWorkType: [String: Double] = [:]
    var byJob: [String: Double] = [:]
}

// MARK: - Saved Week

struct SavedWeek: Identifiable, Codable {
    let id: String
    let name: String
    let week: WeekPlan
    let totalSW: Int
    let createdAt: Date
}

// MARK: - User Profile

struct UserProfile {
    let employeeId: String
    let employeeName: String
    let locationCode: String
}

// MARK: - Field Labels (BC Italian)

struct FieldLabels {
    static let resourceNo = "Nr. risorsa"
    static let resourceName = "Nome risorsa"
    static let status = "Stato"
    static let weekNo = "Nr. settimana"
    static let startingDate = "Data inizio"
    static let endingDate = "Data fine"
    static let periodType = "Tipo periodo"
    static let jobNo = "Nr. commessa"
    static let description = "Descrizione"
    static let type = "Tipo"
    static let no = "Nr."
    static let quantity = "Quantità"
    static let unitOfMeasure = "UdM"
    static let workType = "Tipo lavoro"
    static let chargeable = "Addebitabile"
    static let locationCode = "Codice ubicazione"
}

// MARK: - Day Names

let DAY_NAMES = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"]
let DAY_NAMES_SHORT = ["Lun", "Mar", "Mer", "Gio", "Ven"]
