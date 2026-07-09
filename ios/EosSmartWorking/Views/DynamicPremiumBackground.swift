import SwiftUI

struct DynamicPremiumBackground: View {
    var body: some View {
        ZStack {
            // Base background adapting to light/dark mode
            Color(uiColor: .systemGroupedBackground)
                .ignoresSafeArea()
            
            // Glowing mesh-gradient orbs
            GeometryReader { geometry in
                let w = geometry.size.width
                let h = geometry.size.height
                
                ZStack {
                    // Top-left soft green orb
                    Circle()
                        .fill(Color.green.opacity(0.12))
                        .frame(width: w * 0.8, height: w * 0.8)
                        .blur(radius: 70)
                        .position(x: w * 0.1, y: h * 0.15)
                    
                    // Bottom-right blue orb
                    Circle()
                        .fill(Color.blue.opacity(0.15))
                        .frame(width: w * 0.9, height: w * 0.9)
                        .blur(radius: 80)
                        .position(x: w * 0.9, y: h * 0.8)
                    
                    // Central purple accent orb for deep richness
                    Circle()
                        .fill(Color.purple.opacity(0.08))
                        .frame(width: w * 0.7, height: w * 0.7)
                        .blur(radius: 75)
                        .position(x: w * 0.5, y: h * 0.5)
                }
            }
            .ignoresSafeArea()
        }
    }
}
