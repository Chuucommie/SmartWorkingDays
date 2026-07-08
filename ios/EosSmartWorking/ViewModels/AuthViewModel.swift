import SwiftUI

// MARK: - Auth ViewModel
@MainActor
class AuthViewModel: ObservableObject {
    @Published var mode: AuthMode = .login
    @Published var email = ""
    @Published var password = ""
    @Published var name = ""
    @Published var location = ""
    @Published var resetEmail = ""
    @Published var resetToken = ""
    @Published var newPassword = ""
    @Published var error: String?
    @Published var success: String?
    @Published var loading = false
    @Published var loggedInUser: AuthUser?
    
    private let authService = AuthService()
    
    enum AuthMode { case login, register, forgot, reset }
    
    let locations = ["TREVISO", "BOLOGNA", "MILANO"]
    
    init() {
        if let session = authService.loadSession() {
            loggedInUser = AuthUser(id: session.userId, email: session.email, name: session.name, department: session.department, locationCode: session.locationCode)
        }
    }
    
    func submit() async {
        loading = true
        error = nil
        success = nil
        
        switch mode {
        case .login:
            let result = await authService.login(email: email, password: password)
            if result.success, let user = result.user {
                authService.saveSession(Session(userId: user.id, email: user.email, name: user.name, department: user.department, locationCode: user.locationCode, token: ""))
                loggedInUser = user
            } else {
                error = result.error
            }
            
        case .register:
            guard !name.isEmpty, !location.isEmpty else {
                error = "Compila tutti i campi"
                loading = false
                return
            }
            let result = await authService.register(email: email, password: password, name: name, department: "LABS", locationCode: location)
            if result.success, let user = result.user {
                authService.saveSession(Session(userId: user.id, email: user.email, name: user.name, department: user.department, locationCode: user.locationCode, token: ""))
                loggedInUser = user
            } else {
                error = result.error
            }
            
        case .forgot:
            let result = await authService.requestPasswordReset(email: resetEmail)
            if result.success, let token = result.token {
                let _ = await EmailService.sendPasswordResetEmail(to: resetEmail, resetToken: token)
                success = "Email inviata! Controlla la tua casella."
                self.resetToken = token
                mode = .reset
            } else {
                error = result.error
            }
            
        case .reset:
            guard newPassword.count >= 6 else {
                error = "Password minima 6 caratteri"
                loading = false
                return
            }
            let result = await authService.resetPassword(email: resetEmail, token: resetToken, newPassword: newPassword)
            if result.success {
                success = "Password reimpostata! Ora puoi accedere."
                mode = .login
                email = resetEmail
                password = ""
            } else {
                error = result.error
            }
        }
        
        loading = false
    }
    
    func logout() {
        authService.clearSession()
        loggedInUser = nil
    }
}
