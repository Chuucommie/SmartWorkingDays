import SwiftUI

struct SavedWeeksView: View {
    @StateObject private var store = SavedWeeksStore()

    var body: some View {
        List {
            if store.weeks.isEmpty {
                VStack(spacing: 12) {
                    Text("💾").font(.system(size: 40))
                    Text("Nessuna combinazione salvata")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 48)
                .listRowBackground(Color.clear)
            } else {
                ForEach(store.weeks) { week in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(week.name)
                                .font(.system(size: 14, weight: .semibold))
                            Spacer()
                            Text("🏠 \(week.totalSW) SW")
                                .font(.system(size: 12))
                                .foregroundColor(.green)
                        }
                        HStack(spacing: 4) {
                            ForEach(0..<5) { i in
                                MiniPill(state: week.week[i], label: DAY_NAMES_SHORT[i])
                            }
                        }
                        Text(week.createdAt, style: .date)
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 4)
                }
                .onDelete { indexSet in
                    for idx in indexSet {
                        store.delete(id: store.weeks[idx].id)
                    }
                }
            }
        }
        .navigationTitle("Combinazioni Salvate")
    }
}
