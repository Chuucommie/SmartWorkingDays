import SwiftUI

struct LiquidGlassNavigationBar<Leading: View, Trailing: View>: View {
    let title: String
    var subtitle: String? = nil
    let leading: () -> Leading
    let trailing: () -> Trailing
    
    init(
        title: String,
        subtitle: String? = nil,
        @ViewBuilder leading: @escaping () -> Leading = { EmptyView() },
        @ViewBuilder trailing: @escaping () -> Trailing = { EmptyView() }
    ) {
        self.title = title
        self.subtitle = subtitle
        self.leading = leading
        self.trailing = trailing
    }
    
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                leading()
                    .frame(width: 50, alignment: .leading)
                
                Spacer()
                
                VStack(spacing: 2) {
                    Text(title)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.primary)
                    if let subtitle = subtitle {
                        Text(subtitle)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(maxWidth: .infinity)
                .multilineTextAlignment(.center)
                
                Spacer()
                
                trailing()
                    .frame(width: 50, alignment: .trailing)
            }
            .padding(.horizontal, 16)
            .frame(height: 52)
        }
        .padding(.top, safeAreaTop)
        .background(.ultraThinMaterial)
        .overlay(
            VStack {
                Spacer()
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [Color.white.opacity(0.35), Color.white.opacity(0.08)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: 1)
            }
        )
        .ignoresSafeArea(.container, edges: .top)
    }
    
    private var safeAreaTop: CGFloat {
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            return window.safeAreaInsets.top
        }
        return 44
    }
}
