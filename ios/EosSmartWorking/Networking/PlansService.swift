import Foundation

// MARK: - Plans Service
@MainActor
class PlansService: ObservableObject {
    private let tursoUrl = "https://smartworking-chuucommie.aws-eu-west-1.turso.io"
    private let tursoToken = ""
    private lazy var client = TursoClient(url: tursoUrl, token: tursoToken)
    
    func savePlanning(employeeId: String, employeeName: String, department: String, locationCode: String, weekStart: String, week: WeekPlan, swDaysRequested: Int) async -> OperationResult {
        do {
            let normalizedWeek = DateUtils.normalizeToMonday(weekStart)
            let weekJson = week.map { $0.rawValue }.joined(separator: ",")
            
            let existing = try await client.execute(
                "SELECT id FROM sw_plans WHERE employee_id = ? AND week_start = ?",
                args: [employeeId, normalizedWeek]
            )
            
            let now = ISO8601DateFormatter().string(from: Date())
            
            if !existing.isEmpty {
                try await client.execute(
                    "UPDATE sw_plans SET week = ?, sw_days_requested = ?, employee_name = ?, department = ?, location_code = ?, updated_at = ? WHERE employee_id = ? AND week_start = ?",
                    args: [weekJson, swDaysRequested, employeeName, department, locationCode, now, employeeId, normalizedWeek]
                )
            } else {
                try await client.execute(
                    "INSERT INTO sw_plans (employee_id, employee_name, department, location_code, week_start, week, sw_days_requested, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    args: [employeeId, employeeName, department, locationCode, normalizedWeek, weekJson, swDaysRequested, now, now]
                )
            }
            return OperationResult(success: true, error: nil)
        } catch {
            return OperationResult(success: false, error: error.localizedDescription)
        }
    }
    
    func fetchEmployeePlan(employeeId: String, weekStart: String) async -> TeamMember? {
        do {
            let normalizedWeek = DateUtils.normalizeToMonday(weekStart)
            let rows = try await client.execute(
                "SELECT employee_id, employee_name, location_code, week, sw_days_requested FROM sw_plans WHERE employee_id = ? AND week_start = ?",
                args: [employeeId, normalizedWeek]
            )
            guard let row = rows.first,
                  let weekStr = row["week"] as? String else { return nil }
            
            let week = weekStr.split(separator: ",").compactMap { s -> DayState? in
                DayState(rawValue: String(s))
            }
            
            return TeamMember(
                employeeId: row["employee_id"] as? String ?? "",
                employeeName: row["employee_name"] as? String ?? "",
                locationCode: row["location_code"] as? String ?? "",
                week: week,
                swDaysRequested: Int(row["sw_days_requested"] as? String ?? "0") ?? 0
            )
        } catch {
            return nil
        }
    }
    
    func deletePlanning(employeeId: String, weekStart: String) async -> OperationResult {
        do {
            let normalizedWeek = DateUtils.normalizeToMonday(weekStart)
            try await client.execute(
                "DELETE FROM sw_plans WHERE employee_id = ? AND week_start = ?",
                args: [employeeId, normalizedWeek]
            )
            return OperationResult(success: true, error: nil)
        } catch {
            return OperationResult(success: false, error: error.localizedDescription)
        }
    }
    
    func fetchTeamPlans(weekStart: String, locationCode: String? = nil) async -> [TeamMember] {
        do {
            let normalizedWeek = DateUtils.normalizeToMonday(weekStart)
            let sql: String
            let args: [Any]
            
            if let loc = locationCode, loc != "ALL" {
                sql = "SELECT employee_id, employee_name, location_code, week, sw_days_requested FROM sw_plans WHERE week_start = ? AND location_code = ?"
                args = [normalizedWeek, loc]
            } else {
                sql = "SELECT employee_id, employee_name, location_code, week, sw_days_requested FROM sw_plans WHERE week_start = ?"
                args = [normalizedWeek]
            }
            
            let rows = try await client.execute(sql, args: args)
            return rows.compactMap { row in
                guard let weekStr = row["week"] as? String else { return nil }
                let week = weekStr.split(separator: ",").compactMap { DayState(rawValue: String($0)) }
                return TeamMember(
                    employeeId: row["employee_id"] as? String ?? "",
                    employeeName: row["employee_name"] as? String ?? "",
                    locationCode: row["location_code"] as? String ?? "",
                    week: week,
                    swDaysRequested: Int(row["sw_days_requested"] as? String ?? "0") ?? 0
                )
            }
        } catch {
            return []
        }
    }
}
