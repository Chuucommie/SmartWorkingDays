import SwiftUI

// MARK: - Planner View
struct PlannerView: View {
    @StateObject private var vm = PlannerViewModel()
    @Binding var currentTab: AppTab
    
    let dayLabels = ["Lun", "Mar", "Mer", "Gio", "Ven"]
    
    var body: some View {
        ScrollView {
                VStack(spacing: 16) {
                    // Header
                    VStack(spacing: 4) {
                        Text("Smart Working")
                            .font(.largeTitle.weight(.semibold))
                        Text("Configura i vincoli e scegli la tua settimana")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Text("\(vm.displayName) · \(vm.locationCode)")
                            .font(.caption)
                            .foregroundStyle(.green)
                    }
                    
                    // Card principale
                    VStack(spacing: 16) {
                        // Regola SW
                        VStack(alignment: .leading, spacing: 4) {
                            Text("REGOLA SMART WORKING")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Picker("Regola", selection: $vm.selectedRule) {
                                ForEach(vm.ruleOptions, id: \.0) { key, label in
                                    Text(label).tag(key)
                                }
                            }
                            .pickerStyle(.menu)
                            .onChange(of: vm.selectedRule) { _, _ in
                                vm.selectedPerm = nil
                                vm.recompute()
                            }
                        }
                        
                        // Selettore Settimana
                        VStack(alignment: .leading, spacing: 4) {
                            Text("SETTIMANA DI PIANIFICAZIONE")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            HStack {
                                Button { vm.changeWeek(-1) } label: {
                                    Image(systemName: "chevron.left")
                                }
                                Text(DateUtils.formatWeekRange(vm.weekStart))
                                    .font(.subheadline.weight(.medium))
                                    .frame(maxWidth: .infinity)
                                Button { vm.changeWeek(1) } label: {
                                    Image(systemName: "chevron.right")
                                }
                                Button { vm.goToCurrentWeek() } label: {
                                    Image(systemName: "calendar")
                                }
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 10)
                            .background(.quaternary)
                            .clipShape(Capsule())
                        }
                        
                        // Selettore Giorni
                        VStack(alignment: .leading, spacing: 4) {
                            Text("CONFIGURA SETTIMANA")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("clicca per cambiare stato")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            
                            HStack(spacing: 8) {
                                ForEach(0..<5) { i in
                                    DayPillView(label: dayLabels[i], state: vm.dayStates[i]) {
                                        vm.cycleDay(i)
                                    }
                                }
                            }
                            
                            // Legenda
                            HStack(spacing: 12) {
                                Text("🏠 SW").font(.caption2).foregroundStyle(.green)
                                Text("🏢 Ufficio").font(.caption2).foregroundStyle(.blue)
                                Text("✕ Assenza").font(.caption2).foregroundStyle(.red)
                                Text("◌ Libero").font(.caption2).foregroundStyle(.secondary)
                            }
                        }
                        
                        Divider()
                        
                        // Riepilogo
                        let workedCount = vm.dayStates.filter { $0 != .absent }.count
                        let target = SmartWorkingEngine.computeTarget(rule: vm.swRule, workedCount: workedCount)
                        let ruleDesc = SmartWorkingEngine.describeSwRule(vm.swRule)
                        
                        HStack {
                            Text("Giorni lavorati").foregroundStyle(.secondary)
                            Spacer()
                            Text("\(workedCount)/5").fontWeight(.medium)
                        }
                        HStack {
                            Text("Regola SW").foregroundStyle(.secondary)
                            Spacer()
                            Text(ruleDesc).fontWeight(.medium)
                        }
                        
                        // Result Pill
                        HStack(spacing: 0) {
                            VStack {
                                Text("SMART WORKING").font(.caption2).foregroundStyle(.white.opacity(0.6))
                                Text(String(format: "%.1f", target.targetSW))
                                    .font(.system(size: 36, weight: .bold))
                                    .foregroundStyle(.white)
                                Text("massimo").font(.caption2).foregroundStyle(.white.opacity(0.4))
                            }
                            .frame(maxWidth: .infinity)
                            
                            Divider().frame(height: 60).background(.white.opacity(0.2))
                            
                            VStack {
                                Text("UFFICIO").font(.caption2).foregroundStyle(.white.opacity(0.6))
                                Text(String(format: "%.1f", target.targetOffice))
                                    .font(.system(size: 36, weight: .bold))
                                    .foregroundStyle(.white)
                                Text("minimo").font(.caption2).foregroundStyle(.white.opacity(0.4))
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .padding(20)
                        .background(
                            LinearGradient(colors: [.green, .blue], startPoint: .leading, endPoint: .trailing)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 20))
                        
                        // Permutazioni
                        if !vm.permutations.isEmpty {
                            let validPerms = vm.permutations.filter { $0.valid }
                            VStack(alignment: .leading, spacing: 8) {
                                Text("COMBINAZIONI")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text("\(validPerms.count) valide / \(vm.permutations.count) totali")
                                    .font(.caption)
                                    .foregroundStyle(.green)
                                
                                ForEach(Array(vm.permutations.enumerated()), id: \.offset) { idx, perm in
                                    PermutationRowView(
                                        index: idx + 1,
                                        perm: perm,
                                        isSelected: vm.selectedPerm == idx
                                    ) {
                                        vm.selectedPerm = vm.selectedPerm == idx ? nil : idx
                                    }
                                }
                            }
                        }
                        
                        // Piano esistente
                        if vm.planLoading {
                            Text("⏳ Caricamento piano esistente...")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        
                        if let plan = vm.existingPlan {
                            Divider()
                            VStack(spacing: 12) {
                                Label("Piano già inviato per questa settimana", systemImage: "checkmark.circle.fill")
                                    .foregroundStyle(.green)
                                    .font(.subheadline.weight(.medium))
                                
                                HStack(spacing: 4) {
                                    ForEach(plan.week, id: \.self) { s in
                                        Text(s.icon).font(.title3)
                                    }
                                }
                                
                                HStack(spacing: 12) {
                                    Button("✏️ Modifica") { vm.editExisting() }
                                        .buttonStyle(.borderedProminent)
                                        .tint(.blue)
                                    Button("🗑️ Cancella") { Task { await vm.deletePlan() } }
                                        .buttonStyle(.borderedProminent)
                                        .tint(.red)
                                        .disabled(vm.deleting)
                                }
                                
                                if let msg = vm.deleteMsg {
                                    Text(msg)
                                        .font(.caption)
                                        .foregroundStyle(vm.deleteSuccess ? .green : .red)
                                }
                            }
                            .padding()
                            .background(.green.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        
                        // Azioni (nuovo invio)
                        if vm.existingPlan == nil && !vm.planLoading, let idx = vm.selectedPerm, idx < vm.permutations.count {
                            let perm = vm.permutations[idx]
                            if perm.valid {
                                Divider()
                                
                                if !vm.saving {
                                    Button("💾 Salva combinazione") { vm.saving = true }
                                        .buttonStyle(.bordered)
                                } else {
                                    HStack {
                                        TextField("Nome...", text: $vm.saveName)
                                            .textFieldStyle(.roundedBorder)
                                        Button("✓") { vm.saving = false }
                                            .foregroundStyle(.green)
                                        Button("✕") { vm.saving = false }
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                
                                Button { Task { await vm.publish() } } label: {
                                    HStack {
                                        if vm.publishing { ProgressView() }
                                        Text("📤 Invia pianificazione")
                                    }
                                    .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(.blue)
                                .disabled(vm.publishing)
                                
                                if let msg = vm.publishMsg {
                                    Text(msg)
                                        .font(.caption)
                                        .foregroundStyle(vm.publishSuccess ? .green : .red)
                                }
                            }
                        }
                        
                        Text("Regola: \(ruleDesc) · Puoi fare meno SW del target")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .padding(20)
                    .background(.regularMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 28))
                    
                    // Link navigazione
                    HStack(spacing: 16) {
                        Button("👥 Vedi team") {
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                                currentTab = .team
                            }
                        }
                        .font(.caption)
                    }
                    
                    Text("SmartWorkingDays · IgelDev")
                        .font(.caption2)
                        .foregroundStyle(.secondary.opacity(0.5))
                }
                .padding(16)
        }
    }
}

// MARK: - DayPill Component
struct DayPillView: View {
    let label: String
    let state: DayState
    let onClick: () -> Void
    
    var body: some View {
        VStack(spacing: 4) {
            Text(state.icon).font(.title3)
            Text(label).font(.caption2.weight(.medium))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(bgColor)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .onTapGesture(perform: onClick)
    }
    
    var bgColor: Color {
        switch state {
        case .free: return .quaternary
        case .sw: return .green.opacity(0.15)
        case .office: return .blue.opacity(0.15)
        case .absent: return .red.opacity(0.15)
        case .half: return .orange.opacity(0.15)
        }
    }
}

// MARK: - PermutationRow Component
struct PermutationRowView: View {
    let index: Int
    let perm: Permutation
    let isSelected: Bool
    let onClick: () -> Void
    
    var body: some View {
        HStack(spacing: 8) {
            Text("\(index)")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .frame(width: 20)
            
            HStack(spacing: 2) {
                ForEach(perm.week, id: \.self) { s in
                    Text(s.icon).font(.caption)
                }
            }
            .frame(maxWidth: .infinity)
            
            Text("🏠\(String(format: "%.1f", perm.totalSW))")
                .font(.caption2)
                .foregroundStyle(.green)
            Text("·").font(.caption2).foregroundStyle(.secondary)
            Text("🏢\(String(format: "%.1f", perm.totalOffice))")
                .font(.caption2)
                .foregroundStyle(.blue)
            
            Text(adherenceEmoji + " \(Int(perm.adherence * 100))%")
                .font(.caption2)
            
            if isSelected {
                Image(systemName: "checkmark")
                    .font(.caption)
                    .foregroundStyle(.green)
            }
        }
        .padding(10)
        .background(isSelected ? .green.opacity(0.1) : .quaternary.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isSelected ? .green : .clear, lineWidth: 2)
        )
        .onTapGesture { if perm.valid { onClick() } }
        .opacity(perm.valid ? 1 : 0.4)
    }
    
    var adherenceEmoji: String {
        if perm.adherence >= 0.99 { return "🟢" }
        if perm.adherence >= 0.75 { return "🟡" }
        if perm.adherence >= 0.4 { return "🟠" }
        return "🔴"
    }
}
