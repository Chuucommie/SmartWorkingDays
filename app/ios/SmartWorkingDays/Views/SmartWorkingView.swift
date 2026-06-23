import SwiftUI

// MARK: - Smart Working View

struct SmartWorkingView: View {
    @StateObject private var vm = SmartWorkingViewModel()
    @EnvironmentObject var timesheetVM: TimesheetViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Header
                    headerView

                    // Main Card
                    VStack(spacing: 16) {
                        // Rule dropdown
                        rulePicker

                        // Day selector
                        daySelector

                        Divider()

                        // Summary
                        summaryView

                        // Result pill
                        resultPill

                        // Permutations
                        if !vm.permutations.isEmpty {
                            permutationsList
                        }

                        // Actions
                        if let idx = vm.selectedPermutation, vm.permutations[idx].valid {
                            actionsSection
                        }
                    }
                    .padding(20)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 28))
                    .shadow(color: .black.opacity(0.08), radius: 20, y: 4)

                    // Navigation links
                    navigationLinks
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 24)
            }
            .background(Color(.systemGroupedBackground))
            .navigationBarHidden(true)
        }
    }

    // MARK: - Subviews

    private var headerView: some View {
        VStack(spacing: 8) {
            Image(systemName: "calendar")
                .font(.system(size: 24))
                .foregroundColor(.white)
                .frame(width: 56, height: 56)
                .background(
                    LinearGradient(colors: [.green, .mint], startPoint: .topLeading, endPoint: .bottomTrailing)
                )
                .clipShape(RoundedRectangle(cornerRadius: 24))
                .shadow(color: .green.opacity(0.22), radius: 10, y: 4)

            Text("Smart Working")
                .font(.system(size: 26, weight: .semibold))
            Text(vm.userProfile.employeeName)
                .font(.system(size: 14))
                .foregroundColor(.secondary)
        }
    }

    private var rulePicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("REGOLA SMART WORKING")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.secondary)

            Picker("Regola", selection: $vm.selectedRuleIndex) {
                ForEach(0..<vm.ruleLabels.count, id: \.self) { i in
                    Text(vm.ruleLabels[i]).tag(i)
                }
            }
            .pickerStyle(.menu)
            .padding(12)
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .onChange(of: vm.selectedRuleIndex) { _, newValue in
                vm.selectRule(newValue)
            }
        }
    }

    private var daySelector: some View {
        VStack(spacing: 12) {
            HStack {
                Text("CONFIGURA SETTIMANA")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.secondary)
                Spacer()
                Text("clicca per cambiare stato")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }

            HStack(spacing: 10) {
                ForEach(0..<5) { i in
                    DayPill(
                        label: DAY_NAMES_SHORT[i],
                        state: vm.dayStates[i],
                        action: { vm.cycleState(at: i) }
                    )
                }
            }

            HStack(spacing: 12) {
                LegendPill(icon: "🏠", label: "SW", color: .green)
                LegendPill(icon: "🏢", label: "Ufficio", color: .blue)
                LegendPill(icon: "✕", label: "Assenza", color: .red)
                Text("◌ Libero")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
        }
    }

    private var summaryView: some View {
        VStack(spacing: 8) {
            summaryRow(label: "Giorni lavorati", value: "\(vm.workedCount)/5")
            summaryRow(label: "Regola SW", value: vm.currentRule.description)
            if vm.currentRule.type == .percentage {
                let theoretical = (vm.currentRule.value / 100.0) * Double(vm.workedCount)
                summaryRow(label: "Percentuale (\(Int(vm.currentRule.value))%)", value: String(format: "%.1f giorni", theoretical))
            }
        }
    }

    private func summaryRow(label: String, value: String) -> some View {
        HStack {
            Text(label).font(.system(size: 14)).foregroundColor(.secondary)
            Spacer()
            Text(value).font(.system(size: 14, weight: .medium))
        }
    }

    private var resultPill: some View {
        HStack(spacing: 0) {
            VStack {
                Text("SMART WORKING")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.6))
                Text(String(format: "%.1f", vm.targetSW))
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.white)
                Text("massimo")
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.4))
            }
            .frame(maxWidth: .infinity)

            Divider().frame(height: 50).background(.white.opacity(0.2))

            VStack {
                Text("UFFICIO")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.6))
                Text(String(format: "%.1f", vm.targetOffice))
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.white)
                Text("minimo")
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.4))
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.vertical, 16)
        .background(
            LinearGradient(colors: [Color(hex: "#34C759"), Color(hex: "#248A3D")], startPoint: .top, endPoint: .bottom)
        )
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }

    private var permutationsList: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("COMBINAZIONI")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.secondary)
                Spacer()
                Text("\(vm.validPermutations.count) valide")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.green)
                if vm.permutations.count > vm.validPermutations.count {
                    Button(vm.showAll ? "Solo valide" : "+\(vm.permutations.count - vm.validPermutations.count) non valide") {
                        vm.showAll.toggle()
                    }
                    .font(.system(size: 11))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(.systemGray5))
                    .clipShape(Capsule())
                }
            }

            ScrollView {
                LazyVStack(spacing: 8) {
                    let displayPerms = vm.showAll ? vm.permutations : vm.validPermutations
                    ForEach(Array(displayPerms.enumerated()), id: \.element.id) { (origIdx, perm) in
                        PermutationRow(
                            index: vm.permutations.firstIndex(where: { $0.id == perm.id }) ?? origIdx,
                            perm: perm,
                            isSelected: vm.selectedPermutation == (vm.permutations.firstIndex(where: { $0.id == perm.id }) ?? origIdx),
                            adherence: vm.adherenceBadge(perm.adherence),
                            action: {
                                if perm.valid {
                                    let realIdx = vm.permutations.firstIndex(where: { $0.id == perm.id }) ?? origIdx
                                    vm.selectedPermutation = vm.selectedPermutation == realIdx ? nil : realIdx
                                }
                            }
                        )
                    }
                }
            }
            .frame(maxHeight: 320)
        }
    }

    private var actionsSection: some View {
        VStack(spacing: 12) {
            Divider()

            if !vm.isSaving {
                Button(action: { vm.isSaving = true }) {
                    Label("Salva questa combinazione", systemImage: "square.and.arrow.down")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
            } else {
                HStack(spacing: 8) {
                    TextField("Nome combinazione...", text: $vm.saveName)
                        .textFieldStyle(.roundedBorder)
                    Button("✓") { vm.saveWeek() }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)
                    Button("✕") { vm.isSaving = false; vm.saveName = "" }
                        .buttonStyle(.bordered)
                }
            }

            if let msg = vm.saveMessage {
                Text(msg.text)
                    .font(.system(size: 12))
                    .foregroundColor(msg.type == "success" ? .green : .red)
            }

            Button(action: {
                if let ts = vm.releaseWeek() {
                    timesheetVM.addTimesheet(ts)
                }
            }) {
                Label("Rilascia settimana (crea Timesheet)", systemImage: "paperplane.fill")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .tint(.blue)

            if let msg = vm.releaseMessage {
                Text(msg)
                    .font(.system(size: 12))
                    .foregroundColor(.green)
            }
        }
    }

    private var navigationLinks: some View {
        VStack(spacing: 8) {
            HStack(spacing: 16) {
                NavigationLink("👥 Vedi team") { Text("Team View — coming soon") }
                    .font(.system(size: 13))
                NavigationLink("💾 Combinazioni salvate") { SavedWeeksView() }
                    .font(.system(size: 13))
                NavigationLink("⏱️ Timesheet") { TimesheetView() }
                    .font(.system(size: 13))
            }
            Text("SmartWorkingDays v3 · IgelDev")
                .font(.system(size: 11))
                .foregroundColor(.secondary.opacity(0.5))
        }
    }
}

// MARK: - Day Pill

struct DayPill: View {
    let label: String
    let state: DayState
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                if state == .sw || state == .office || state == .absent || state == .half {
                    Circle()
                        .fill(stateColor)
                        .frame(width: 6, height: 6)
                } else {
                    Spacer().frame(height: 6)
                }
                Text(state.icon)
                    .font(.system(size: 18))
                Text(label)
                    .font(.system(size: 12))
            }
            .frame(width: 56, height: 64)
            .background(stateBgColor)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain)
    }

    private var stateColor: Color {
        switch state {
        case .sw: return .green
        case .office: return .blue
        case .absent: return .red
        case .half: return .orange
        case .free: return .clear
        }
    }

    private var stateBgColor: Color {
        switch state {
        case .sw: return .green.opacity(0.12)
        case .office: return .blue.opacity(0.12)
        case .absent: return .red.opacity(0.12)
        case .half: return .orange.opacity(0.12)
        case .free: return Color(.systemGray6)
        }
    }
}

// MARK: - Legend Pill

struct LegendPill: View {
    let icon: String
    let label: String
    let color: Color

    var body: some View {
        HStack(spacing: 4) {
            Text(icon).font(.system(size: 11))
            Text(label).font(.system(size: 11))
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(color.opacity(0.12))
        .clipShape(Capsule())
    }
}

// MARK: - Permutation Row

struct PermutationRow: View {
    let index: Int
    let perm: Permutation
    let isSelected: Bool
    let adherence: (emoji: String, label: String, color: Color)
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Text("\(index + 1)")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
                    .frame(width: 20)

                HStack(spacing: 4) {
                    ForEach(0..<5) { i in
                        MiniPill(state: perm.week[i], label: DAY_NAMES_SHORT[i])
                    }
                }

                Spacer()

                HStack(spacing: 4) {
                    Text("🏠\(perm.totalSW)")
                        .font(.system(size: 11, weight: perm.valid ? .medium : .regular))
                        .foregroundColor(perm.valid ? .green : .secondary)
                    Text("·").foregroundColor(.secondary)
                    Text("🏢\(perm.totalOffice)")
                        .font(.system(size: 11, weight: perm.valid ? .medium : .regular))
                        .foregroundColor(perm.valid ? .blue : .secondary)
                }

                Text("\(adherence.emoji) \(Int(perm.adherence * 100))%")
                    .font(.system(size: 11))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(adherence.color.opacity(0.12))
                    .clipShape(Capsule())

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 14))
                    .foregroundColor(isSelected ? .green : .secondary.opacity(0.4))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(isSelected ? Color.green.opacity(0.08) : Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.green : Color.clear, lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
        .opacity(perm.valid ? 1 : 0.4)
        .disabled(!perm.valid)
    }
}

// MARK: - Mini Pill

struct MiniPill: View {
    let state: DayState
    let label: String

    var body: some View {
        HStack(spacing: 2) {
            Text(state.icon).font(.system(size: 10))
            Text(label).font(.system(size: 9))
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(pillColor.opacity(0.15))
        .clipShape(Capsule())
    }

    private var pillColor: Color {
        switch state {
        case .sw: return .green
        case .office: return .blue
        case .half: return .orange
        case .absent: return .red
        case .free: return .gray
        }
    }
}

// MARK: - Color Hex Helper

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, (int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = ((int >> 24) & 0xFF, (int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
