import SwiftUI

// MARK: - Team ViewModel
@MainActor
class TeamViewModel: ObservableObject {
    @Published var weekStart = DateUtils.getCurrentWeekStart()
    @Published var locationFilter = ""
    @Published var myPlan: TeamMember?
    @Published var colleagues: [TeamMember] = []
    @Published var loading = true
    @Published var error: String?
    @Published var deleting = false
    @Published var deleteMsg: String?
    @Published var deleteSuccess = false
    @Published var myEmployeeId = ""
    @Published var myLocationCode = ""
    
    private let authService = AuthService()
    private let plansService = PlansService()
    
    let locations = ["TREVISO", "BOLOGNA", "MILANO"]
    
    init() {
        if let session = authService.loadSession() {
            myEmployeeId = session.userId
            myLocationCode = session.locationCode
        }
        Task { await loadTeamData() }
    }
    
    func changeWeek(_ direction: Int) {
        let d = DateUtils.parseDate(weekStart)
        let newDate = Calendar.current.date(byAdding: .day, value: direction * 7, to: d)!
        weekStart = DateUtils.formatLocalDate(newDate)
        Task { await loadTeamData() }
    }
    
    func goToCurrentWeek() {
        weekStart = DateUtils.getCurrentWeekStart()
        Task { await loadTeamData() }
    }
    
    func loadTeamData() async {
        loading = true
        error = nil
        
        let filter = locationFilter.isEmpty ? myLocationCode : locationFilter
        let allPlans = await plansService.fetchTeamPlans(weekStart: weekStart, locationCode: filter == "ALL" ? nil : filter)
        
        myPlan = allPlans.first { $0.employeeId == myEmployeeId }
        colleagues = allPlans.filter { $0.employeeId != myEmployeeId }
        loading = false
    }
    
    func deleteMyPlan() async {
        deleting = true
        deleteMsg = nil
        
        let result = await plansService.deletePlanning(employeeId: myEmployeeId, weekStart: weekStart)
        
        deleting = false
        deleteSuccess = result.success
        deleteMsg = result.success ? "Pianificazione cancellata!" : (result.error ?? "Errore")
        
        if result.success { await loadTeamData() }
    }
    
    func computeOfficeOverlaps() -> [Int: [String]] {
        guard let myPlan = myPlan else { return [:] }
        var overlaps = [Int: [String]]()
        for (i, s) in myPlan.week.enumerated() where s == .office {
            let inOffice = colleagues.filter { $0.week.indices.contains(i) && $0.week[i] == .office }
            if !inOffice.isEmpty {
                overlaps[i] = inOffice.map { $0.employeeName }
            }
        }
        return overlaps
    }
}
