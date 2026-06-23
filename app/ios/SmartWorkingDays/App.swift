import SwiftUI

@main
struct SmartWorkingDaysApp: App {
    @StateObject private var timesheetVM = TimesheetViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(timesheetVM)
        }
    }
}

struct ContentView: View {
    @EnvironmentObject var timesheetVM: TimesheetViewModel

    var body: some View {
        TabView {
            SmartWorkingView()
                .tabItem {
                    Label("Smart Working", systemImage: "house")
                }

            TimesheetView()
                .tabItem {
                    Label("Timesheet", systemImage: "clock")
                }
        }
    }
}
