import Foundation

// MARK: - Email Service (via Cloudflare Worker)
enum EmailService {
    private static let workerURL = "https://resend-proxy.chuucommie.workers.dev"
    private static let fromEmail = "salazar.ricardo0509@gmail.com"
    
    static func sendPasswordResetEmail(to: String, resetToken: String) async -> Bool {
        let body: [String: Any] = [
            "to": to,
            "from": fromEmail,
            "subject": "EOS Smart Working - Reset Password",
            "html": """
            <h2>Reset Password - EOS Smart Working</h2>
            <p>Hai richiesto il reset della password.</p>
            <p>Il tuo token di reset è: <strong>\(resetToken)</strong></p>
            <p>Oppure usa questo link: <a href="https://chuucommie.github.io/SmartWorkingDays/?reset=\(resetToken)&email=\(to)">Reimposta password</a></p>
            <p>Il token scade tra 1 ora.</p>
            """
        ]
        
        guard let url = URL(string: "\(workerURL)/send"),
              let httpBody = try? JSONSerialization.data(withJSONObject: body) else {
            return false
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = httpBody
        
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            return (response as? HTTPURLResponse)?.statusCode == 200
        } catch {
            return false
        }
    }
}
