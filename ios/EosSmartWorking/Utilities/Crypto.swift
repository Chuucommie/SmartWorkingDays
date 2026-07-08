import Foundation
import CommonCrypto

// MARK: - Crypto utilities (PBKDF2)
enum Crypto {
    
    static func generateSalt() -> String {
        var bytes = [UInt8](repeating: 0, count: 16)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return bytes.map { String(format: "%02x", $0) }.joined()
    }
    
    static func generateUserId() -> String {
        var bytes = [UInt8](repeating: 0, count: 8)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        let raw = bytes.map { String(Int($0) & 0xFF, radix: 36) }.joined()
        return "usr_" + raw.replacingOccurrences(of: "0", with: "")
    }
    
    static func generateResetToken() -> String {
        var bytes = [UInt8](repeating: 0, count: 16)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return bytes.map { String(format: "%02x", $0) }.joined()
    }
    
    static func hashPassword(_ password: String, salt: String) -> String {
        let passwordData = password.data(using: .utf8)!
        let saltData = salt.data(using: .utf8)!
        var derivedKey = [UInt8](repeating: 0, count: 32)
        
        passwordData.withUnsafeBytes { passwordBytes in
            saltData.withUnsafeBytes { saltBytes in
                CCKeyDerivationPBKDF(
                    CCPBKDFAlgorithm(kCCPBKDF2),
                    passwordBytes.baseAddress?.assumingMemoryBound(to: Int8.self),
                    passwordData.count,
                    saltBytes.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    saltData.count,
                    CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),
                    600_000,
                    &derivedKey,
                    32
                )
            }
        }
        
        return derivedKey.map { String(format: "%02x", $0) }.joined()
    }
}
