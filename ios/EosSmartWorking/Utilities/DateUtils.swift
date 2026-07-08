import Foundation

// MARK: - Date utilities
enum DateUtils {
    
    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()
    
    private static let weekRangeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "d MMM"
        f.locale = Locale(identifier: "it_IT")
        return f
    }()
    
    static func getCurrentWeekStart() -> String {
        let today = Date()
        let calendar = Calendar.current
        let monday = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: today))!
        return dateFormatter.string(from: monday)
    }
    
    static func normalizeToMonday(_ dateStr: String) -> String {
        guard let date = dateFormatter.date(from: dateStr) else { return dateStr }
        let calendar = Calendar.current
        let monday = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date))!
        return dateFormatter.string(from: monday)
    }
    
    static func formatLocalDate(_ date: Date) -> String {
        dateFormatter.string(from: date)
    }
    
    static func formatWeekRange(_ start: String) -> String {
        guard let d = dateFormatter.date(from: start) else { return start }
        let end = Calendar.current.date(byAdding: .day, value: 4, to: d)!
        return "\(weekRangeFormatter.string(from: d)) – \(weekRangeFormatter.string(from: end))"
    }
    
    static func parseDate(_ dateStr: String) -> Date {
        dateFormatter.date(from: dateStr) ?? Date()
    }
}
