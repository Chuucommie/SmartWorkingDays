import SwiftUI

// MARK: - LiquidGlass TabBar (stile IgelNotes)
// Effetto vetro liquido con GlassOrb rifrangente e aberrazione cromatica

enum AppTab: String, CaseIterable {
    case planner, team, settings
    
    var icon: String {
        switch self {
        case .planner: return "calendar"
        case .team: return "person.3.fill"
        case .settings: return "gearshape.fill"
        }
    }
    
    var label: String {
        switch self {
        case .planner: return "Pianifica"
        case .team: return "Team"
        case .settings: return "Impostazioni"
        }
    }
}

struct LiquidGlassTabBar: View {
    @Binding var currentTab: AppTab
    @Namespace private var animation
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(AppTab.allCases, id: \.self) { tab in
                tabButton(tab: tab)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(.ultraThinMaterial)
        .cornerRadius(32)
        .overlay(
            RoundedRectangle(cornerRadius: 32)
                .stroke(
                    LinearGradient(
                        colors: [Color.white.opacity(0.3), Color.white.opacity(0.08)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1.5
                )
        )
        .shadow(color: Color.black.opacity(0.18), radius: 15, x: 0, y: 8)
        .padding(.horizontal, 20)
        .padding(.bottom, 24)
    }
    
    @ViewBuilder
    private func tabButton(tab: AppTab) -> some View {
        let isActive = currentTab == tab
        
        Button {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                currentTab = tab
            }
        } label: {
            ZStack {
                // GlassOrb attivo con matched geometry
                if isActive {
                    GlassOrb()
                        .offset(y: -4)
                        .matchedGeometryEffect(id: "active_pill", in: animation)
                } else {
                    Color.clear
                        .frame(width: 56, height: 56)
                }
                
                VStack(spacing: 4) {
                    Image(systemName: tab.icon)
                        .font(.system(size: 19, weight: isActive ? .bold : .medium))
                    Text(tab.label)
                        .font(.system(size: 11, weight: isActive ? .bold : .medium))
                }
                .foregroundColor(isActive ? .primary : .secondary)
                .padding(.vertical, 8)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - GlassOrb (da IgelNotes)
/// Sfera di vetro liquidglass con effetto lente rifrangente ed aberrazione cromatica sul bordo.
struct GlassOrb: View {
    var body: some View {
        ZStack {
            // Sfocatura lente di base (Backdrop blur)
            Circle()
                .fill(.ultraThinMaterial)
            
            // Gradiente interno per la tridimensionalità della lente di vetro
            Circle()
                .fill(
                    RadialGradient(
                        gradient: Gradient(colors: [
                            Color.white.opacity(0.35),
                            Color.white.opacity(0.05),
                            Color.black.opacity(0.08)
                        ]),
                        center: .center,
                        startRadius: 0,
                        endRadius: 28
                    )
                )
            
            // Aberrazione cromatica / gradiente prismatico sul bordo esterno
            Circle()
                .stroke(
                    LinearGradient(
                        colors: [
                            Color.red.opacity(0.25),
                            Color.orange.opacity(0.2),
                            Color.yellow.opacity(0.2),
                            Color.green.opacity(0.22),
                            Color.blue.opacity(0.25),
                            Color.purple.opacity(0.25),
                            Color.white.opacity(0.5)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1.8
                )
            
            // Riflesso speculare a mezzaluna superiore (Specular highlight)
            Circle()
                .fill(
                    RadialGradient(
                        gradient: Gradient(colors: [Color.white.opacity(0.6), Color.clear]),
                        center: .init(x: 0.32, y: 0.32),
                        startRadius: 0,
                        endRadius: 12
                    )
                )
        }
        .frame(width: 68, height: 68)
        .shadow(color: Color.black.opacity(0.22), radius: 10, x: 0, y: 5)
    }
}
