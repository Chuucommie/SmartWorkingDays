import Foundation

// MARK: - Smart Working Engine
enum SmartWorkingEngine {
    
    private static let epsilon = 0.001
    
    struct TargetResult {
        let targetSW: Double
        let targetOffice: Double
    }
    
    static func computeTarget(rule: SwRule, workedCount: Int) -> TargetResult {
        let targetSW: Double
        switch rule.type {
        case "percentage":
            let raw = (Double(rule.value) / 100.0) * Double(workedCount)
            switch workedCount {
            case 4: targetSW = ceil(raw * 2) / 2.0
            case 3: targetSW = ceil(raw * 2) / 2.0
            case 2: targetSW = floor(raw * 2) / 2.0
            case 1: targetSW = floor(raw * 2) / 2.0
            default: targetSW = round(raw * 2) / 2.0
            }
        case "fixed":
            targetSW = min(Double(rule.value), Double(workedCount))
        default:
            targetSW = 0
        }
        return TargetResult(targetSW: targetSW, targetOffice: Double(workedCount) - targetSW)
    }
    
    static func describeSwRule(_ rule: SwRule) -> String {
        switch rule.type {
        case "percentage": return "\(rule.value)% Smart Working"
        case "fixed": return "Max \(rule.value) giorni SW"
        default: return "Nessuna regola"
        }
    }
    
    static func generateAllPermutations(dayStates: WeekPlan, rule: SwRule) -> [Permutation] {
        let workedCount = dayStates.filter { $0 != .absent }.count
        let targetResult = computeTarget(rule: rule, workedCount: workedCount)
        let targetSW = targetResult.targetSW
        
        let freeIndices = dayStates.enumerated().compactMap { $0.element == .free ? $0.offset : nil }
        var fixedSW = 0.0
        dayStates.forEach { if $0 == .sw { fixedSW += 1.0 } }
        
        let k = freeIndices.count
        
        if k == 0 {
            let valid = fixedSW <= targetSW + epsilon
            let adherence = targetSW > 0 ? min(fixedSW / targetSW, 1.0) : 1.0
            return [Permutation(week: dayStates, totalSW: fixedSW, totalOffice: Double(workedCount) - fixedSW, valid: valid, adherence: adherence)]
        }
        
        let totalCombos = Int(pow(3.0, Double(k)))
        let choices: [DayState] = [.sw, .office, .half]
        var all = [Permutation]()
        
        for mask in 0..<totalCombos {
            var week = dayStates
            var assignedSW = 0.0
            var m = mask
            
            for bit in 0..<k {
                let choice = m % 3
                m /= 3
                let dayIdx = freeIndices[bit]
                let state = choices[choice]
                week[dayIdx] = state
                switch state {
                case .sw: assignedSW += 1.0
                case .half: assignedSW += 0.5
                default: break
                }
            }
            
            let totalSW = fixedSW + assignedSW
            let totalOffice = Double(workedCount) - totalSW
            let valid = totalSW <= targetSW + epsilon
            let adherence = targetSW > 0 ? min(totalSW / targetSW, 1.0) : 1.0
            
            all.append(Permutation(week: week, totalSW: totalSW, totalOffice: totalOffice, valid: valid, adherence: adherence))
        }
        
        all.sort { $0.totalSW > $1.totalSW }
        return all
    }
}
