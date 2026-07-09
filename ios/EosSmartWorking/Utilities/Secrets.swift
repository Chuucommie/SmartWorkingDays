import Foundation

/// Helper per leggere i secrets da Secrets.plist (generato da secret.xcconfig).
/// Il file Secrets.plist NON è committato — ogni sviluppatore lo genera con scripts/generate-secrets.sh.
enum Secrets {
    /// URL del database Turso
    static let tursoUrl: String = {
        value(for: "TURSO_URL") ?? "https://smartworking-chuucommie.aws-eu-west-1.turso.io"
    }()
    
    /// Token JWT per autenticazione Turso
    static let tursoToken: String = {
        value(for: "TURSO_TOKEN") ?? ""
    }()
    
    // MARK: - Private
    
    private static func value(for key: String) -> String? {
        guard let path = Bundle.main.path(forResource: "Secrets", ofType: "plist"),
              let dict = NSDictionary(contentsOfFile: path) as? [String: String] else {
            print("⚠️ Secrets.plist non trovato. Esegui scripts/generate-secrets.sh")
            return nil
        }
        return dict[key]
    }
}
