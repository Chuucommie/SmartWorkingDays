import SwiftUI

// MARK: - Timesheet View

struct TimesheetView: View {
    @EnvironmentObject var vm: TimesheetViewModel

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 8) {
                Image(systemName: "clock")
                    .font(.system(size: 24))
                    .foregroundColor(.white)
                    .frame(width: 56, height: 56)
                    .background(
                        LinearGradient(colors: [Color(hex: "#007AFF"), Color(hex: "#0056B3")], startPoint: .topLeading, endPoint: .bottomTrailing)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 24))
                    .shadow(color: Color(hex: "#007AFF").opacity(0.22), radius: 10, y: 4)

                Text("Timesheet")
                    .font(.system(size: 26, weight: .semibold))
                Text(vm.userProfile.employeeName)
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
            }
            .padding(.top, 24)

            // Tab bar
            HStack(spacing: 4) {
                tabButton("📋 Elenco", .list)
                tabButton(vm.editingTimesheet != nil ? "✏️ Modifica" : "➕ Nuovo", .new)
                tabButton("📊 Statistiche", .stats)
            }
            .padding(4)
            .background(Color(.systemGray6))
            .clipShape(Capsule())
            .padding(.horizontal, 16)
            .padding(.vertical, 12)

            // Message
            if let msg = vm.saveMessage {
                Text(msg)
                    .font(.system(size: 13, weight: .medium))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.green.opacity(0.1))
                    .clipShape(Capsule())
                    .padding(.bottom, 8)
            }

            // Content
            ScrollView {
                VStack(spacing: 16) {
                    switch vm.currentTab {
                    case .list: timesheetList
                    case .new: timesheetEditor
                    case .stats: statsView
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
        }
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - Tab Button

    private func tabButton(_ title: String, _ tab: TimesheetViewModel.Tab) -> some View {
        Button(action: { vm.currentTab = tab }) {
            Text(title)
                .font(.system(size: 13, weight: .medium))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(vm.currentTab == tab ? Color(.systemBackground) : .clear)
                .foregroundColor(vm.currentTab == tab ? .primary : .secondary)
                .clipShape(Capsule())
        }
    }

    // MARK: - Timesheet List

    private var timesheetList: some View {
        VStack(spacing: 12) {
            // Filter
            HStack {
                Picker("Stato", selection: $vm.filterStatus) {
                    Text("Tutti gli stati").tag(nil as TimesheetStatus?)
                    ForEach(TimesheetStatus.allCases, id: \.self) { status in
                        Text(status.label).tag(status as TimesheetStatus?)
                    }
                }
                .pickerStyle(.menu)
                .font(.system(size: 12))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(.systemBackground))
                .clipShape(Capsule())

                Spacer()

                Button(action: vm.createNew) {
                    Text("+ Nuovo Timesheet")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.blue)
                        .clipShape(Capsule())
                }
            }

            if vm.filteredTimesheets.isEmpty {
                VStack(spacing: 12) {
                    Text("📭").font(.system(size: 40))
                    Text("Nessun timesheet trovato")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 48)
            } else {
                ForEach(vm.filteredTimesheets) { ts in
                    TimesheetCard(
                        timesheet: ts,
                        isExpanded: vm.selectedTimesheet?.id == ts.id,
                        onTap: {
                            vm.selectedTimesheet = vm.selectedTimesheet?.id == ts.id ? nil : ts
                        },
                        onEdit: { vm.editTimesheet(ts) },
                        onStats: { vm.statsTimesheet = ts; vm.currentTab = .stats },
                        onApprove: { vm.approveTimesheet(ts.id) },
                        onReject: { vm.rejectTimesheet(ts.id) },
                        onDelete: { vm.deleteTimesheet(ts.id) }
                    )
                }
            }
        }
    }

    // MARK: - Timesheet Editor

    private var timesheetEditor: some View {
        guard let ts = vm.editingTimesheet else {
            return AnyView(EmptyView())
        }

        return AnyView(VStack(spacing: 16) {
            // Header card
            VStack(alignment: .leading, spacing: 12) {
                Text("GENERALE")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.secondary)

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    fieldView(FieldLabels.resourceNo, ts.header.resourceNo, readonly: true)
                    fieldView(FieldLabels.resourceName, ts.header.resourceName, readonly: true)
                    fieldView(FieldLabels.status, ts.header.status.label, readonly: true, color: Color(hex: ts.header.status.color))
                    fieldView(FieldLabels.weekNo, "\(ts.header.weekNo)", readonly: true)
                    fieldView(FieldLabels.startingDate, TimesheetEngine.formatDate(ts.header.startingDate), readonly: true)
                    fieldView(FieldLabels.endingDate, TimesheetEngine.formatDate(ts.header.endingDate), readonly: true)
                    fieldView(FieldLabels.periodType, ts.header.periodType, readonly: true)
                    fieldView(FieldLabels.jobNo, ts.header.jobNo, readonly: false) { newVal in
                        vm.editingTimesheet?.header.jobNo = newVal
                    }
                }

                fieldView(FieldLabels.description, ts.header.description, readonly: false) { newVal in
                    vm.editingTimesheet?.header.description = newVal
                }
            }
            .padding(20)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 20))

            // Lines card
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("RIGHE")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("Totale: \(String(format: "%.1f", TimesheetEngine.computeTotalHours(ts.lines)))h")
                        .font(.system(size: 14, weight: .bold))
                }

                let days = TimesheetEngine.groupByDay(lines: ts.lines, weekNo: ts.header.weekNo)
                ForEach(days) { day in
                    DaySection(
                        day: day,
                        isExpanded: vm.expandedDays.contains(day.dayIndex),
                        onToggle: { vm.toggleDay(day.dayIndex) },
                        onAddLine: { vm.addLine(dayIndex: day.dayIndex) },
                        onUpdateLine: { lineId, updates in vm.updateLine(lineId, updates) },
                        onRemoveLine: { vm.removeLine($0) }
                    )
                }
            }
            .padding(20)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 20))

            // Action buttons
            HStack(spacing: 12) {
                Button(action: vm.saveDraft) {
                    Text("💾 Salva bozza")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.bordered)

                Button(action: vm.submitTimesheet) {
                    Text("📤 Invia in approvazione")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
                .tint(.blue)
            }

            Button(action: { vm.editingTimesheet = nil; vm.currentTab = .list }) {
                Text("← Annulla")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
            }
        })
    }

    // MARK: - Stats View

    private var statsView: some View {
        guard let ts = vm.statsTimesheet else {
            return AnyView(VStack(spacing: 12) {
                Text("📊").font(.system(size: 40))
                Text("Seleziona un timesheet dall'elenco per vedere le statistiche")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                Button("Vai all'elenco") { vm.currentTab = .list }
                    .font(.system(size: 14))
            }
            .padding(.vertical, 48))
        }

        let stats = TimesheetEngine.computeStats(for: ts)
        let days = TimesheetEngine.groupByDay(lines: ts.lines, weekNo: ts.header.weekNo)

        return AnyView(VStack(spacing: 16) {
            // Total
            VStack(spacing: 8) {
                Text("\(ts.header.no) — \(ts.header.description)")
                    .font(.system(size: 14, weight: .semibold))
                Text("\(String(format: "%.1f", stats.totalHours))h")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.blue)
                Text("Ore totali — Sett. \(ts.header.weekNo)")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
            .padding(20)
            .frame(maxWidth: .infinity)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 20))

            // Per day
            VStack(alignment: .leading, spacing: 8) {
                Text("ORE PER GIORNO")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.secondary)

                let maxH = days.map(\.totalHours).max() ?? 1
                ForEach(days) { day in
                    HStack(spacing: 8) {
                        Text("\(DAY_NAMES_SHORT[day.dayIndex]) \(TimesheetEngine.formatDateShort(day.date))")
                            .font(.system(size: 12))
                            .frame(width: 80, alignment: .leading)

                        GeometryReader { geo in
                            RoundedRectangle(cornerRadius: 4)
                                .fill(day.totalHours > 8 ? Color.orange : Color.blue)
                                .frame(width: max(geo.size.width * (day.totalHours / max(maxH, 1)), 4))
                        }
                        .frame(height: 20)
                        .background(Color(.systemGray5))
                        .clipShape(RoundedRectangle(cornerRadius: 4))

                        Text("\(String(format: "%.1f", day.totalHours))h")
                            .font(.system(size: 12, weight: .bold))
                            .frame(width: 40, alignment: .trailing)
                    }
                }
            }
            .padding(20)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 20))

            // By work type
            if !stats.byWorkType.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("PER TIPO LAVORO")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.secondary)
                    ForEach(Array(stats.byWorkType.keys.sorted()), id: \.self) { key in
                        HStack {
                            Text(key).font(.system(size: 14))
                            Spacer()
                            Text("\(String(format: "%.1f", stats.byWorkType[key] ?? 0))h")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
                .padding(20)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 20))
            }

            // By job
            if !stats.byJob.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("PER COMMESSA")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.secondary)
                    ForEach(Array(stats.byJob.keys.sorted()), id: \.self) { key in
                        HStack {
                            Text(key).font(.system(size: 14))
                            Spacer()
                            Text("\(String(format: "%.1f", stats.byJob[key] ?? 0))h")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
                .padding(20)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 20))
            }

            Button("← Torna all'elenco") { vm.currentTab = .list }
                .font(.system(size: 14))
        })
    }

    // MARK: - Field View

    private func fieldView(_ label: String, _ value: String, readonly: Bool, color: Color? = nil, onChange: ((String) -> Void)? = nil) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.secondary)
            if readonly {
                Text(value)
                    .font(.system(size: 13))
                    .foregroundColor(color ?? .primary)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                TextField(label, text: Binding(
                    get: { value },
                    set: { onChange?($0) }
                ))
                .font(.system(size: 13))
                .padding(10)
                .background(Color(.systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }
}

// MARK: - Timesheet Card

struct TimesheetCard: View {
    let timesheet: Timesheet
    let isExpanded: Bool
    let onTap: () -> Void
    let onEdit: () -> Void
    let onStats: () -> Void
    let onApprove: () -> Void
    let onReject: () -> Void
    let onDelete: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Button(action: onTap) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(timesheet.header.no)
                            .font(.system(size: 14, weight: .semibold))
                        Text(timesheet.header.description)
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                        Spacer()
                        Text(timesheet.header.status.label)
                            .font(.system(size: 11, weight: .semibold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color(hex: timesheet.header.status.color).opacity(0.12))
                            .foregroundColor(Color(hex: timesheet.header.status.color))
                            .clipShape(Capsule())
                    }

                    HStack(spacing: 12) {
                        Text("📅 Sett. \(timesheet.header.weekNo)")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                        Text("\(TimesheetEngine.formatDateShort(timesheet.header.startingDate)) — \(TimesheetEngine.formatDateShort(timesheet.header.endingDate))")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                        Text("⏱️ \(String(format: "%.1f", TimesheetEngine.computeStats(for: timesheet).totalHours))h")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                }
                .padding(16)
            }
            .buttonStyle(.plain)

            if isExpanded {
                Divider().padding(.horizontal, 16)
                HStack(spacing: 8) {
                    Button("✏️ Modifica", action: onEdit)
                        .font(.system(size: 12))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color(.systemGray5))
                        .clipShape(Capsule())
                    Button("📊 Statistiche", action: onStats)
                        .font(.system(size: 12))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color(.systemGray5))
                        .clipShape(Capsule())
                    if timesheet.header.status == .pendingApproval {
                        Button("✓ Approva", action: onApprove)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.green)
                            .clipShape(Capsule())
                        Button("✕ Respingi", action: onReject)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.red)
                            .clipShape(Capsule())
                    }
                    Spacer()
                    Button("🗑 Elimina", action: onDelete)
                        .font(.system(size: 12))
                        .foregroundColor(.red)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.red.opacity(0.08))
                        .clipShape(Capsule())
                }
                .padding(12)
            }
        }
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - Day Section

struct DaySection: View {
    let day: DaySummary
    let isExpanded: Bool
    let onToggle: () -> Void
    let onAddLine: () -> Void
    let onUpdateLine: (String, (inout TimesheetLine) -> Void) -> Void
    let onRemoveLine: (String) -> Void

    var body: some View {
        VStack(spacing: 0) {
            Button(action: onToggle) {
                HStack {
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .font(.system(size: 14))
                    Text("\(day.dayName) \(TimesheetEngine.formatDateShort(day.date))")
                        .font(.system(size: 14, weight: .semibold))
                    if day.totalHours > 0 {
                        Text("\(String(format: "%.1f", day.totalHours))h")
                            .font(.system(size: 12, weight: .bold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.blue.opacity(0.12))
                            .foregroundColor(.blue)
                            .clipShape(Capsule())
                    }
                    Spacer()
                    Button(action: onAddLine) {
                        Text("+ Aggiungi riga")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color(.systemGray5))
                            .clipShape(Capsule())
                    }
                }
                .padding(12)
                .background(day.totalHours > 0 ? Color.blue.opacity(0.06) : Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)

            if isExpanded {
                if day.lines.isEmpty {
                    Text("Nessuna riga per questo giorno")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                        .padding(.vertical, 8)
                } else {
                    ForEach(day.lines) { line in
                        LineEditor(
                            line: line,
                            onUpdate: { updates in onUpdateLine(line.id, updates) },
                            onRemove: { onRemoveLine(line.id) }
                        )
                    }
                }
            }
        }
    }
}

// MARK: - Line Editor

struct LineEditor: View {
    let line: TimesheetLine
    let onUpdate: ((inout TimesheetLine) -> Void) -> Void
    let onRemove: () -> Void

    @State private var type: LineType
    @State private var no: String
    @State private var description: String
    @State private var quantity: Double
    @State private var unitOfMeasure: UnitOfMeasure
    @State private var jobNo: String
    @State private var workType: String
    @State private var chargeable: Bool
    @State private var locationCode: String

    init(line: TimesheetLine, onUpdate: @escaping ((inout TimesheetLine) -> Void) -> Void, onRemove: @escaping () -> Void) {
        self.line = line
        self.onUpdate = onUpdate
        self.onRemove = onRemove
        _type = State(initialValue: line.type)
        _no = State(initialValue: line.no)
        _description = State(initialValue: line.description)
        _quantity = State(initialValue: line.quantity)
        _unitOfMeasure = State(initialValue: line.unitOfMeasure)
        _jobNo = State(initialValue: line.jobNo)
        _workType = State(initialValue: line.workType)
        _chargeable = State(initialValue: line.chargeable)
        _locationCode = State(initialValue: line.locationCode)
    }

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text("Riga \(line.lineNo)")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.secondary)
                Spacer()
                Button(action: onRemove) {
                    Text("✕")
                        .font(.system(size: 12))
                        .foregroundColor(.red)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.red.opacity(0.08))
                        .clipShape(Capsule())
                }
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                pickerField(FieldLabels.type, $type, LineType.allCases.map { ($0, $0.label) })
                textField(FieldLabels.no, $no)
                textFieldFull(FieldLabels.description, $description)
                numberField(FieldLabels.quantity, $quantity)
                pickerField(FieldLabels.unitOfMeasure, $unitOfMeasure, UnitOfMeasure.allCases.map { ($0, $0.label) })
                textField(FieldLabels.jobNo, $jobNo)
                textField(FieldLabels.workType, $workType)
                pickerField(FieldLabels.chargeable, $chargeable, [(true, "Sì"), (false, "No")])
                textField(FieldLabels.locationCode, $locationCode)
            }
        }
        .padding(12)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .onChange(of: type) { _, _ in sync() }
        .onChange(of: no) { _, _ in sync() }
        .onChange(of: description) { _, _ in sync() }
        .onChange(of: quantity) { _, _ in sync() }
        .onChange(of: unitOfMeasure) { _, _ in sync() }
        .onChange(of: jobNo) { _, _ in sync() }
        .onChange(of: workType) { _, _ in sync() }
        .onChange(of: chargeable) { _, _ in sync() }
        .onChange(of: locationCode) { _, _ in sync() }
    }

    private func sync() {
        onUpdate { line in
            line.type = type
            line.no = no
            line.description = description
            line.quantity = quantity
            line.unitOfMeasure = unitOfMeasure
            line.jobNo = jobNo
            line.workType = workType
            line.chargeable = chargeable
            line.locationCode = locationCode
        }
    }

    private func textField(_ label: String, _ value: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.system(size: 10, weight: .medium)).foregroundColor(.secondary)
            TextField(label, text: value).font(.system(size: 12)).padding(8).background(Color(.systemBackground)).clipShape(RoundedRectangle(cornerRadius: 6))
        }
    }

    private func textFieldFull(_ label: String, _ value: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.system(size: 10, weight: .medium)).foregroundColor(.secondary)
            TextField(label, text: value).font(.system(size: 12)).padding(8).background(Color(.systemBackground)).clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .gridCellColumns(2)
    }

    private func numberField(_ label: String, _ value: Binding<Double>) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.system(size: 10, weight: .medium)).foregroundColor(.secondary)
            TextField(label, value: value, format: .number).font(.system(size: 12)).padding(8).background(Color(.systemBackground)).clipShape(RoundedRectangle(cornerRadius: 6)).keyboardType(.decimalPad)
        }
    }

    private func pickerField<T: Hashable>(_ label: String, _ selection: Binding<T>, _ options: [(T, String)]) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.system(size: 10, weight: .medium)).foregroundColor(.secondary)
            Picker(label, selection: selection) {
                ForEach(options, id: \.0) { opt in Text(opt.1).tag(opt.0) }
            }
            .pickerStyle(.menu)
            .font(.system(size: 12))
            .padding(8)
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
    }
}
