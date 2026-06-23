import Foundation

// MARK: - Smart Working Engine

struct SmartWorkingEngine {

    /// Genera tutte le permutazioni base-3 per i giorni liberi
    static func generateAllPermutations(week: WeekPlan, rule: SwRule) -> [Permutation] {
        let workedDays = week.filter { $0.isWorkingDay }.count
        let (targetSW, _) = rule.computeTarget(workedDays: workedDays)

        // Trova gli indici dei giorni liberi
        let freeIndices = week.enumerated().compactMap { $0.element == .free ? $0.offset : nil }
        let freeCount = freeIndices.count

        // 3^k permutazioni (sw, office, half)
        let totalPerms = Int(pow(3.0, Double(freeCount)))
        var results: [Permutation] = []

        for mask in 0..<totalPerms {
            var candidate = week
            var m = mask
            for idx in freeIndices {
                switch m % 3 {
                case 0: candidate[idx] = .sw
                case 1: candidate[idx] = .office
                case 2: candidate[idx] = .half
                default: break
                }
                m /= 3
            }

            let sw = candidate.filter { $0 == .sw }.count
            let office = candidate.filter { $0 == .office }.count
            let half = candidate.filter { $0 == .half }.count
            let swCount = Double(sw) + Double(half) / 2.0
            let valid = swCount <= targetSW + 0.001
            let adherence = targetSW > 0 ? min(swCount / targetSW, 1.0) : 1.0

            results.append(Permutation(
                week: candidate,
                totalSW: sw,
                totalOffice: office,
                totalHalf: half,
                valid: valid,
                adherence: adherence
            ))
        }

        // Ordina per SW decrescente
        results.sort { $0.swCount > $1.swCount }
        return results
    }
}

// MARK: - Timesheet Engine

struct TimesheetEngine {

    static let dayNames = DAY_NAMES
    static let dayNamesShort = DAY_NAMES_SHORT

    // MARK: Week helpers

    static func getWeekNumber(from date: Date = Date()) -> Int {
        let cal = Calendar(identifier: .iso8601)
        return cal.component(.weekOfYear, from: date)
    }

    static func getWeekRange(weekNo: Int, year: Int? = nil) -> (start: String, end: String) {
        let cal = Calendar(identifier: .iso8601)
        let y = year ?? cal.component(.yearForWeekOfYear, from: Date())
        var comps = DateComponents()
        comps.yearForWeekOfYear = y
        comps.weekOfYear = weekNo
        comps.weekday = 2 // Monday
        let monday = cal.date(from: comps)!
        let sunday = cal.date(byAdding: .day, value: 6, to: monday)!
        let fmt = { (d: Date) in ISO8601DateFormatter().string(from: d).prefix(10) }
        return (String(fmt(monday)), String(fmt(sunday)))
    }

    static func getWeekDates(weekNo: Int, year: Int? = nil) -> [String] {
        let cal = Calendar(identifier: .iso8601)
        let y = year ?? cal.component(.yearForWeekOfYear, from: Date())
        var comps = DateComponents()
        comps.yearForWeekOfYear = y
        comps.weekOfYear = weekNo
        comps.weekday = 2
        let monday = cal.date(from: comps)!
        let fmt = { (d: Date) in String(ISO8601DateFormatter().string(from: d).prefix(10)) }
        return (0..<5).map { fmt(cal.date(byAdding: .day, value: $0, to: monday)!) }
    }

    // MARK: Factory

    static func createEmptyTimesheet(resourceNo: String, resourceName: String, locationCode: String) -> Timesheet {
        let weekNo = getWeekNumber()
        let (start, end) = getWeekRange(weekNo: weekNo)
        let no = "TS\(String(format: "%02d", weekNo))\(String(format: "%02d", Calendar.current.component(.day, from: Date())))"

        let header = TimesheetHeader(
            no: no,
            resourceNo: resourceNo,
            resourceName: resourceName,
            startingDate: start,
            endingDate: end,
            weekNo: weekNo
        )
        return Timesheet(header: header)
    }

    static func createTimesheetFromSW(
        resourceNo: String,
        resourceName: String,
        week: WeekPlan,
        weekNo: Int,
        sedeCode: String,
        jobNo: String? = nil
    ) -> Timesheet {
        let (start, end) = getWeekRange(weekNo: weekNo)
        let no = "TS\(String(format: "%02d", weekNo))SW"
        let dates = getWeekDates(weekNo: weekNo)

        var header = TimesheetHeader(
            no: no,
            resourceNo: resourceNo,
            resourceName: resourceName,
            status: .pendingApproval,
            startingDate: start,
            endingDate: end,
            weekNo: weekNo,
            jobNo: jobNo ?? "",
            description: "Smart Working — Sett. \(weekNo)"
        )

        var lines: [TimesheetLine] = []
        for (i, state) in week.enumerated() {
            guard state.isWorkingDay else { continue }
            let location: String
            let hours: Double
            let desc: String

            switch state {
            case .sw:
                location = "Smart Working"
                hours = 8
                desc = "Smart Working — \(dayNames[i])"
            case .half:
                location = "Smart Working"
                hours = 4
                desc = "Smart Working (mezza giornata) — \(dayNames[i])"
            case .office:
                location = sedeCode
                hours = 8
                desc = "Sede — \(dayNames[i])"
            default:
                continue
            }

            lines.append(TimesheetLine(
                timesheetId: header.id,
                lineNo: lines.count + 1,
                type: .resource,
                no: resourceNo,
                description: desc,
                quantity: hours,
                unitOfMeasure: .hours,
                jobNo: jobNo ?? "",
                workType: "Billable",
                chargeable: true,
                locationCode: location,
                dayIndex: i
            ))
        }

        return Timesheet(header: header, lines: lines)
    }

    // MARK: Line operations

    static func addEmptyLine(to timesheet: Timesheet, dayIndex: Int) -> Timesheet {
        var ts = timesheet
        let line = TimesheetLine(
            timesheetId: ts.header.id,
            lineNo: ts.lines.count + 1,
            no: ts.header.resourceNo,
            dayIndex: dayIndex
        )
        ts.lines.append(line)
        return ts
    }

    static func updateLine(in timesheet: Timesheet, lineId: String, updates: (inout TimesheetLine) -> Void) -> Timesheet {
        var ts = timesheet
        if let idx = ts.lines.firstIndex(where: { $0.id == lineId }) {
            updates(&ts.lines[idx])
        }
        return ts
    }

    static func removeLine(from timesheet: Timesheet, lineId: String) -> Timesheet {
        var ts = timesheet
        ts.lines.removeAll { $0.id == lineId }
        for i in ts.lines.indices { ts.lines[i].lineNo = i + 1 }
        return ts
    }

    static func changeStatus(of timesheet: Timesheet, to newStatus: TimesheetStatus) -> Timesheet {
        var ts = timesheet
        ts.header.status = newStatus
        ts.header.updatedAt = ISO8601DateFormatter().string(from: Date())
        return ts
    }

    // MARK: Grouping

    static func groupByDay(lines: [TimesheetLine], weekNo: Int) -> [DaySummary] {
        let dates = getWeekDates(weekNo: weekNo)
        var groups: [Int: [TimesheetLine]] = [:]
        for i in 0..<5 { groups[i] = [] }
        for line in lines { groups[line.dayIndex, default: []].append(line) }

        return dayNames.enumerated().map { (i, name) in
            let dayLines = groups[i] ?? []
            return DaySummary(
                dayIndex: i,
                dayName: name,
                date: dates[i],
                lines: dayLines,
                totalHours: dayLines.reduce(0) { $0 + $1.quantity }
            )
        }
    }

    // MARK: Stats

    static func computeStats(for timesheet: Timesheet) -> TimesheetStats {
        var stats = TimesheetStats()
        for line in timesheet.lines {
            stats.totalHours += line.quantity
            stats.byDay[line.dayIndex, default: 0] += line.quantity
            let wt = line.workType.isEmpty ? "Standard" : line.workType
            stats.byWorkType[wt, default: 0] += line.quantity
            if !line.jobNo.isEmpty {
                stats.byJob[line.jobNo, default: 0] += line.quantity
            }
        }
        return stats
    }

    static func computeTotalHours(_ lines: [TimesheetLine]) -> Double {
        lines.reduce(0) { $0 + $1.quantity }
    }

    // MARK: Validation

    static func validateTimesheet(_ timesheet: Timesheet) -> (valid: Bool, errors: [String], warnings: [String]) {
        var errors: [String] = []
        var warnings: [String] = []

        if timesheet.header.resourceNo.isEmpty { errors.append("Nr. risorsa obbligatorio") }
        if timesheet.header.resourceName.isEmpty { errors.append("Nome risorsa obbligatorio") }
        if timesheet.lines.isEmpty { warnings.append("Nessuna riga inserita") }

        for line in timesheet.lines {
            if line.quantity <= 0 { errors.append("Riga \(line.lineNo): Quantità deve essere > 0") }
            if line.quantity > 24 { warnings.append("Riga \(line.lineNo): \(line.quantity)h in un giorno — verificare") }
            if line.description.isEmpty { errors.append("Riga \(line.lineNo): Descrizione obbligatoria") }
        }

        return (errors.isEmpty, errors, warnings)
    }

    // MARK: Formatting

    static func formatDate(_ iso: String) -> String {
        let df = DateFormatter()
        df.locale = Locale(identifier: "it_IT")
        df.dateStyle = .medium
        guard let d = ISO8601DateFormatter().date(from: iso + "T00:00:00Z") else { return iso }
        return df.string(from: d)
    }

    static func formatDateShort(_ iso: String) -> String {
        let df = DateFormatter()
        df.locale = Locale(identifier: "it_IT")
        df.dateFormat = "d/M"
        guard let d = ISO8601DateFormatter().date(from: iso + "T00:00:00Z") else { return iso }
        return df.string(from: d)
    }
}

// MARK: - Saved Weeks Store

class SavedWeeksStore: ObservableObject {
    @Published var weeks: [SavedWeek] = []

    private let key = "savedWeeks_v3"

    init() { load() }

    func save(name: String, week: WeekPlan, totalSW: Int) -> Bool {
        guard !name.trimmingCharacters(in: .whitespaces).isEmpty else { return false }
        let sw = SavedWeek(
            id: UUID().uuidString,
            name: name,
            week: week,
            totalSW: totalSW,
            createdAt: Date()
        )
        weeks.insert(sw, at: 0)
        persist()
        return true
    }

    func delete(id: String) {
        weeks.removeAll { $0.id == id }
        persist()
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: key),
              let decoded = try? JSONDecoder().decode([SavedWeek].self, from: data)
        else { return }
        weeks = decoded
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(weeks) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }
}
