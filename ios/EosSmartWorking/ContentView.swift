import SwiftUI

struct ContentView: View {
    @State private var currentTab: AppTab = .planner
    
    var body: some View {
        ZStack(alignment: .bottom) {
            // Contenuto principale
            Group {
                switch currentTab {
                case .planner:
                    PlannerView(currentTab: $currentTab)
                case .team:
                    TeamView(currentTab: $currentTab)
                case .settings:
                    SettingsView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            
            // LiquidGlass TabBar fluttuante
            LiquidGlassTabBar(currentTab: $currentTab)
        }
        .ignoresSafeArea(.keyboard)
    }
}
