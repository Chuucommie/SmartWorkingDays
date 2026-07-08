import SwiftUI

// MARK: - Settings ViewModel
@MainActor
class SettingsViewModel: ObservableObject {
    @Published var profile: UserProfile?
    @Published var displayName = ""
    @Published var locationCode = ""
    @Published var loading = true
    @Published var saving = false
    @Published var saveMsg: String?
    @Published var saveSuccess = false
    @Published var newEmail = ""
    @Published var currentPassword = ""
    @Published var emailLoading = false
    @Published var emailMsg: String?
    @Published var emailSuccess = false
    @Published var userId = ""
    @Published var userEmail = ""
    
    private let authService = AuthService()
    private let settingsService = SettingsService()
    
    let locations = ["TREVISO", "BOLOGNA", "MILANO"]
    
    init() {
        Task {
            if let session = authService.loadSession() {
                userId = session.userId
                userEmail = session.email
                displayName = session.name
                locationCode = session.locationCode
                
                if let p = await settingsService.loadUserProfile(userId: session.userId) {
                    profile = p
                    displayName = p.displayName
                    locationCode = p.locationCode
                }
            }
            loading = false
        }
    }
    
    func saveProfile() async {
        guard !displayName.isEmpty else {
            saveMsg = "Inserisci il tuo nome"
            saveSuccess = false
            return
        }
        guard !locationCode.isEmpty else {
            saveMsg = "Seleziona la tua sede"
            saveSuccess = false
            return
        }
        
        saving = true
        saveMsg = nil
        
        let result = await settingsService.saveUserProfile(
            userId: userId, email: userEmail,
            displayName: displayName.trimmingCharacters(in: .whitespaces),
            locationCode: locationCode, department: "IT"
        )
        
        saving = false
        saveSuccess = result.success
        saveMsg = result.success ? "Impostazioni salvate nel database!" : (result.error ?? "Errore")
    }
    
    func changeEmail() async {
        guard newEmail.contains("@") else {
            emailMsg = "Inserisci un indirizzo email valido"
            emailSuccess = false
            return
        }
        guard !currentPassword.isEmpty else {
            emailMsg = "Inserisci la password attuale"
            emailSuccess = false
            return
        }
        
        emailLoading = true
        emailMsg = nil
        
        let result = await authService.changeEmail(
            userId: userId, newEmail: newEmail.trimmingCharacters(in: .whitespaces),
            currentPassword: currentPassword
        )
        
        emailLoading = false
        emailSuccess = result.success
        emailMsg = result.success ? "Email aggiornata con successo!" : (result.error ?? "Errore")
        
        if result.success {
            newEmail = ""
            currentPassword = ""
            userEmail = newEmail
        }
    }
}
