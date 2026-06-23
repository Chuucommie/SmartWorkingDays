import SwiftUI
import Combine

// MARK: - Smart Working ViewModel

@MainActor
class SmartWorkingViewModel: ObservableObject {
    @Published var dayStates: WeekPlan = [.free, .free, .free, .free, .free]
    @Published var selectedRuleIndex: Int = 0
    @Published var selectedPermutation: Int? = nil
    @Published var showAll = false
    @Published var saveName = ""
    @Published var isSaving = false
    @Published var saveMessage: (type: String, text: String)? = nil
    @Published var releaseMessage: String? = nil
    @Published var permutations: [Permutation] = []

    let ruleOptions: [SwRule] = [
        SwRule(type: .percentage, value: 60),
        SwRule(type: .percentage, value: 40),
        SwRule(type: .fixed, value: 2),
        SwRule(type: .fixed, value: 3),
    ]

    let ruleLabels = ["60% Smart Working", "40% Smart Working", "Max 2 giorni SW", "Max 3 giorni SW"]

    var currentRule: SwRule { ruleOptions[selectedRuleIndex] }

    let userProfile = UserProfile(
        employeeId: "EMP001",
        employeeName: "Ricardo Quintero",
        locationCode: "BOLOGNA"
    )

    var workedCount: Int { dayStates.filter { $0.isWorkingDay }.count }
    var targetSW: Double { currentRule.computeTarget(workedDays: workedCount).targetSW }
    var targetOffice: Double { currentRule.computeTarget(workedDays: workedCount).targetOffice }

    var validPermutations: [Permutation] { permutations.filter { $0.valid } }

    func cycleState(at index: Int) {
        let order: [DayState] = [.free, .sw, .office, .absent]
        guard let currentIdx = order.firstIndex(of: dayStates[index]) else { return }
        dayStates[index] = order[(currentIdx + 1) % order.count]
        selectedPermutation = nil
        recalculate()
    }

    func recalculate() {
        permutations = SmartWorkingEngine.generateAllPermutations(week: dayStates, rule: currentRule)
    }

    func selectRule(_ index: Int) {
        selectedRuleIndex = index
        selectedPermutation = nil
        recalculate()
    }

    func saveWeek() {
        guard let idx = selectedPermutation, permutations[idx].valid else { return }
        let name = saveName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else {
            saveMessage = ("error", "Inserisci un nome")
            return
        }
        let perm = permutations[idx]
        let store = SavedWeeksStore()
        if store.save(name: name, week: perm.week, totalSW: perm.totalSW) {
            saveMessage = ("success", "\"\(name)\" salvata!")
            saveName = ""
            isSaving = false
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
            self?.saveMessage = nil
        }
    }

    func releaseWeek() -> Timesheet? {
        guard let idx = selectedPermutation, permutations[idx].valid else { return nil }
        let perm = permutations[idx]
        let ts = TimesheetEngine.createTimesheetFromSW(
            resourceNo: userProfile.employeeId,
            resourceName: userProfile.employeeName,
            week: perm.week,
            weekNo: TimesheetEngine.getWeekNumber(),
            sedeCode: userProfile.locationCode
        )
        releaseMessage = "Timesheet \(ts.header.no) creato e inviato in approvazione!"
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in
            self?.releaseMessage = nil
        }
        return ts
    }

    func adherenceBadge(_ adherence: Double) -> (emoji: String, label: String, color: Color) {
        if adherence >= 0.99 { return ("🟢", "Ottimale", .green) }
        if adherence >= 0.75 { return ("🟡", "Buono", .yellow) }
        if adherence >= 0.4  { return ("🟠", "Parziale", .orange) }
        return ("🔴", "Minimo", .red)
    }
}

// MARK: - Timesheet ViewModel

@MainActor
class TimesheetViewModel: ObservableObject {
    @Published var timesheets: [Timesheet] = []
    @Published var selectedTimesheet: Timesheet? = nil
    @Published var editingTimesheet: Timesheet? = nil
    @Published var statsTimesheet: Timesheet? = nil
    @Published var filterStatus: TimesheetStatus? = nil
    @Published var expandedDays: Set<Int> = [0, 1, 2, 3, 4]
    @Published var saveMessage: String? = nil
    @Published var currentTab: Tab = .list

    enum Tab { case list, new, stats }

    let userProfile = UserProfile(
        employeeId: "EMP001",
        employeeName: "Ricardo Quintero",
        locationCode: "BOLOGNA"
    )

    var filteredTimesheets: [Timesheet] {
        guard let status = filterStatus else { return timesheets }
        return timesheets.filter { $0.header.status == status }
    }

    init() {
        loadMockData()
    }

    func loadMockData() {
        let weekNo = TimesheetEngine.getWeekNumber()
        let prevWeek = weekNo - 1

        let ts1 = TimesheetEngine.createTimesheetFromSW(
            resourceNo: "EMP001",
            resourceName: "Ricardo Quintero",
            week: [.sw, .sw, .office, .office, .sw],
            weekNo: prevWeek,
            sedeCode: "BOLOGNA",
            jobNo: "JOB-2024-001"
        )
        var approved = ts1
        approved.header.status = .approved
        approved.header.description = "Sviluppo modulo Timesheet"

        let ts2 = TimesheetEngine.createEmptyTimesheet(
            resourceNo: "EMP001",
            resourceName: "Ricardo Quintero",
            locationCode: "BOLOGNA"
        )
        var open = ts2
        open.header.description = "Documentazione e test"

        timesheets = [approved, open]
    }

    func addTimesheet(_ ts: Timesheet) {
        if !timesheets.contains(where: { $0.id == ts.id }) {
            timesheets.insert(ts, at: 0)
        }
    }

    func createNew() {
        editingTimesheet = TimesheetEngine.createEmptyTimesheet(
            resourceNo: userProfile.employeeId,
            resourceName: userProfile.employeeName,
            locationCode: userProfile.locationCode
        )
        expandedDays = [0, 1, 2, 3, 4]
        currentTab = .new
    }

    func editTimesheet(_ ts: Timesheet) {
        editingTimesheet = ts
        expandedDays = [0, 1, 2, 3, 4]
        currentTab = .new
    }

    func deleteTimesheet(_ id: String) {
        timesheets.removeAll { $0.id == id }
        if selectedTimesheet?.id == id { selectedTimesheet = nil }
    }

    func submitTimesheet() {
        guard let ts = editingTimesheet else { return }
        let (valid, errors, _) = TimesheetEngine.validateTimesheet(ts)
        guard valid else {
            saveMessage = errors.first
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in self?.saveMessage = nil }
            return
        }
        let updated = TimesheetEngine.changeStatus(of: ts, to: .pendingApproval)
        if let idx = timesheets.firstIndex(where: { $0.id == ts.id }) {
            timesheets[idx] = updated
        } else {
            timesheets.insert(updated, at: 0)
        }
        editingTimesheet = nil
        currentTab = .list
        saveMessage = "Timesheet inviato in approvazione ✓"
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in self?.saveMessage = nil }
    }

    func saveDraft() {
        guard let ts = editingTimesheet else { return }
        if let idx = timesheets.firstIndex(where: { $0.id == ts.id }) {
            timesheets[idx] = ts
        } else {
            timesheets.insert(ts, at: 0)
        }
        editingTimesheet = nil
        currentTab = .list
        saveMessage = "Bozza salvata ✓"
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in self?.saveMessage = nil }
    }

    func approveTimesheet(_ id: String) {
        guard let idx = timesheets.firstIndex(where: { $0.id == id }) else { return }
        timesheets[idx] = TimesheetEngine.changeStatus(of: timesheets[idx], to: .approved)
    }

    func rejectTimesheet(_ id: String) {
        guard let idx = timesheets.firstIndex(where: { $0.id == id }) else { return }
        timesheets[idx] = TimesheetEngine.changeStatus(of: timesheets[idx], to: .rejected)
    }

    func addLine(dayIndex: Int) {
        guard var ts = editingTimesheet else { return }
        ts = TimesheetEngine.addEmptyLine(to: ts, dayIndex: dayIndex)
        editingTimesheet = ts
    }

    func updateLine(_ lineId: String, _ updates: (inout TimesheetLine) -> Void) {
        guard var ts = editingTimesheet else { return }
        ts = TimesheetEngine.updateLine(in: ts, lineId: lineId, updates: updates)
        editingTimesheet = ts
    }

    func removeLine(_ lineId: String) {
        guard var ts = editingTimesheet else { return }
        ts = TimesheetEngine.removeLine(from: ts, lineId: lineId)
        editingTimesheet = ts
    }

    func toggleDay(_ dayIndex: Int) {
        if expandedDays.contains(dayIndex) {
            expandedDays.remove(dayIndex)
        } else {
            expandedDays.insert(dayIndex)
        }
    }
}
