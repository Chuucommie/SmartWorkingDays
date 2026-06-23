// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SmartWorkingDays",
    platforms: [.iOS(.v17)],
    targets: [
        .executableTarget(
            name: "SmartWorkingDays",
            path: "SmartWorkingDays"
        )
    ]
)
