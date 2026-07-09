import SwiftUI

// MARK: - Team View
struct TeamView: View {
    @StateObject private var vm = TeamViewModel()
    @Binding var currentTab: AppTab
    
    let dayLabels = ["Lun", "Mar", "Mer", "Gio", "Ven"]
    let dayLabelsFull = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"]
    var body: some View {
        ZStack(alignment: .top) {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 16) {
                    Spacer().frame(height: 64) // Spacer per la barra di navigazione
                    
                    // Controlli
                    HStack {
                        // Navigazione settimana
                        HStack(spacing: 4) {
                            Button { vm.changeWeek(-1) } label: {
                                Image(systemName: "chevron.left")
                            }
                            Text(DateUtils.formatWeekRange(vm.weekStart))
                                .font(.subheadline.weight(.medium))
                            Button { vm.changeWeek(1) } label: {
                                Image(systemName: "chevron.right")
                            }
                            Button { vm.goToCurrentWeek() } label: {
                                Image(systemName: "calendar")
                            }
                        }
                        
                        Spacer()
                        
                        // Filtro sede
                        Picker("Sede", selection: $vm.locationFilter) {
                            Text("La mia sede").tag("")
                            Text("🏢 Tutte le sedi").tag("ALL")
                            Divider()
                            ForEach(vm.locations, id: \.self) { loc in
                                Text("📍 \(loc.capitalized)").tag(loc)
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: vm.locationFilter) { _, _ in
                            Task { await vm.loadTeamData() }
                        }
                    }
                    
                    // Loading
                    if vm.loading {
                        ProgressView("Caricamento...")
                    }
                    
                    // Error
                    if let error = vm.error {
                        VStack {
                            Label(error, systemImage: "exclamationmark.triangle.fill")
                                .foregroundStyle(.red)
                            Button("Riprova") { Task { await vm.loadTeamData() } }
                        }
                        .padding()
                        .background(.red.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    
                    // Card utente corrente
                    if !vm.loading {
                        if let plan = vm.myPlan {
                            MemberCardView(
                                member: plan,
                                isSelf: true,
                                overlaps: vm.computeOfficeOverlaps(),
                                onDelete: { Task { await vm.deleteMyPlan() } },
                                deleting: vm.deleting,
                                deleteMsg: vm.deleteMsg,
                                deleteSuccess: vm.deleteSuccess
                            )
                        } else {
                            VStack(spacing: 8) {
                                Text("Tu").font(.headline)
                                Text("Non hai ancora pianificato questa settimana")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Button("Pianifica ora →") {
                                    withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                                        currentTab = .planner
                                    }
                                }
                                .font(.caption)
                            }
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(.quaternary)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        
                        // Colleghi
                        if vm.colleagues.isEmpty && vm.myPlan != nil {
                            VStack(spacing: 8) {
                                Text("😶").font(.largeTitle)
                                Text("Nessun collega ha ancora pianificato")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(.regularMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        
                        ForEach(vm.colleagues) { colleague in
                            MemberCardView(member: colleague, isSelf: false, overlaps: [:])
                        }
                        
                        // Sezione coincidenze
                        if vm.myPlan != nil {
                            OfficeOverlapSectionView(myPlan: vm.myPlan!, colleagues: vm.colleagues)
                        }
                    }
                    
                    Button("📅 Pianifica") {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                            currentTab = .planner
                        }
                    }
                    .font(.caption)
                    
                    Spacer().frame(height: 100) // Spacer per evitare la tab bar fluttuante
                }
                .padding(16)
            }
            
            LiquidGlassNavigationBar(
                title: "Team",
                subtitle: vm.locationFilter.isEmpty ? "La mia sede" : (vm.locationFilter == "ALL" ? "Tutte le sedi" : "Sede: \(vm.locationFilter.capitalized)")
            )
        }
    }
}

// MARK: - MemberCard Component
struct MemberCardView: View {
    let member: TeamMember
    let isSelf: Bool
    let overlaps: [Int: [String]]
    var onDelete: (() -> Void)? = nil
    var deleting = false
    var deleteMsg: String? = nil
    var deleteSuccess = false
    
    let dayLabels = ["Lun", "Mar", "Mer", "Gio", "Ven"]
    
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading) {
                    Text("\(isSelf ? "👤 " : "")\(member.employeeName)")
                        .font(.headline)
                    Text("📍 \(member.locationCode)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                HStack(spacing: 8) {
                    BadgeView(text: "🏠 \(member.week.filter { $0 == .sw }.count)", color: .green)
                    BadgeView(text: "🏢 \(member.week.filter { $0 == .office }.count)", color: .blue)
                }
            }
            
            // Griglia giorni
            HStack(spacing: 8) {
                ForEach(0..<5) { i in
                    let state = member.week.indices.contains(i) ? member.week[i] : .free
                    let hasOverlap = isSelf && overlaps.keys.contains(i)
                    let overlapCount = overlaps[i]?.count ?? 0
                    
                    VStack(spacing: 2) {
                        Text(dayLabels[i])
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Text(state.icon)
                            .font(.title3)
                        if hasOverlap {
                            Text("👥\(overlapCount)")
                                .font(.caption2)
                                .foregroundStyle(.blue)
                        }
                    }
                    .padding(6)
                    .background(bgColor(for: state))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            
            // Delete (solo self)
            if isSelf, let onDelete = onDelete {
                if let msg = deleteMsg {
                    Text(msg)
                        .font(.caption)
                        .foregroundStyle(deleteSuccess ? .green : .red)
                }
                Button(role: .destructive) { onDelete() } label: {
                    Text(deleting ? "⏳..." : "🗑️ Cancella pianificazione")
                }
                .disabled(deleting)
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(isSelf ? .green : .clear, lineWidth: 2)
        )
    }
    
    func bgColor(for state: DayState) -> Color {
        switch state {
        case .sw: return .green.opacity(0.1)
        case .office: return .blue.opacity(0.1)
        case .absent: return .red.opacity(0.1)
        default: return .clear
        }
    }
}

struct BadgeView: View {
    let text: String
    let color: Color
    
    var body: some View {
        Text(text)
            .font(.caption2)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - OfficeOverlapSection Component
struct OfficeOverlapSectionView: View {
    let myPlan: TeamMember
    let colleagues: [TeamMember]
    
    let dayLabelsFull = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"]
    
    var officeDays: [Int] {
        myPlan.week.enumerated().compactMap { $0.element == .office ? $0.offset : nil }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("🏢 Chi è in ufficio con te")
                .font(.headline)
            
            if officeDays.isEmpty {
                Text("Non hai giorni in ufficio questa settimana.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(officeDays, id: \.self) { (dayIdx: Int) in
                    let inOffice = colleagues.filter { colleague in
                        colleague.week.indices.contains(dayIdx) && colleague.week[dayIdx] == .office
                    }
                    
                    HStack(spacing: 12) {
                        VStack {
                            Text(String(dayLabelsFull[dayIdx].prefix(3)).uppercased())
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Text("🏢")
                                .font(.title3)
                        }
                        .frame(width: 44)
                        
                        if !inOffice.isEmpty {
                            VStack(alignment: .leading) {
                                Text("👥 \(inOffice.count) \(inOffice.count == 1 ? "collega" : "colleghi") in ufficio")
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(.blue)
                                Text(inOffice.map { $0.employeeName }.joined(separator: ", "))
                                    .font(.caption)
                            }
                        } else {
                            Text("🏠 Solo tu in ufficio")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(inOffice.isEmpty ? Color(uiColor: .quaternarySystemFill) : Color.blue.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(.blue, lineWidth: 2)
        )
    }
}
