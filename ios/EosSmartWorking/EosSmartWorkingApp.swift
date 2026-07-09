import SwiftUI

@main
struct EosSmartWorkingApp: App {
    @State private var isLoggedIn = false
    
    var body: some Scene {
        WindowGroup {
            ZStack {
                DynamicPremiumBackground()
                
                if !isLoggedIn {
                    AuthView(onLoginSuccess: {
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                            isLoggedIn = true
                        }
                    })
                    .transition(.opacity.combined(with: .scale(scale: 0.95)))
                } else {
                    ContentView()
                        .transition(.opacity.combined(with: .scale(scale: 1.05)))
                }
            }
            .animation(.spring(response: 0.5, dampingFraction: 0.8), value: isLoggedIn)
        }
    }
}
