import SwiftUI

// MARK: - Auth View
struct AuthView: View {
    @StateObject private var vm = AuthViewModel()
    var onLoginSuccess: () -> Void
    
    var body: some View {
        if vm.loggedInUser != nil {
            Color.clear.onAppear { onLoginSuccess() }
        } else {
            ScrollView {
                VStack(spacing: 24) {
                    // Icon
                    Image(systemName: "lock.shield.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(.green)
                    
                    Text("EOS Smart Working")
                        .font(.largeTitle.weight(.semibold))
                    
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    
                    // Card
                    VStack(spacing: 20) {
                        // Tabs
                        if vm.mode == .login || vm.mode == .register {
                            Picker("Mode", selection: $vm.mode) {
                                Text("🔑 Accedi").tag(AuthViewModel.AuthMode.login)
                                Text("✨ Registrati").tag(AuthViewModel.AuthMode.register)
                            }
                            .pickerStyle(.segmented)
                        }
                        
                        // Campi comuni
                        if vm.mode == .login || vm.mode == .register {
                            TextField("📧 Email", text: $vm.email)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .textFieldStyle(.roundedBorder)
                            
                            SecureField("🔒 Password", text: $vm.password)
                                .textFieldStyle(.roundedBorder)
                        }
                        
                        // Registrazione
                        if vm.mode == .register {
                            TextField("👤 Nome completo", text: $vm.name)
                                .textFieldStyle(.roundedBorder)
                            
                            Text("Dipartimento: LABS")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            
                            Picker("📍 Sede", selection: $vm.location) {
                                Text("-- Seleziona sede --").tag("")
                                ForEach(vm.locations, id: \.self) { loc in
                                    Text(loc.capitalized).tag(loc)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                        
                        // Forgot
                        if vm.mode == .forgot {
                            Text("Inserisci la tua email. Riceverai un token per reimpostare la password.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            TextField("📧 Email", text: $vm.resetEmail)
                                .textContentType(.emailAddress)
                                .textFieldStyle(.roundedBorder)
                        }
                        
                        // Reset
                        if vm.mode == .reset {
                            TextField("📧 Email", text: $vm.resetEmail)
                                .textFieldStyle(.roundedBorder)
                            TextField("🔑 Token di reset", text: $vm.resetToken)
                                .textFieldStyle(.roundedBorder)
                            SecureField("🔒 Nuova password", text: $vm.newPassword)
                                .textFieldStyle(.roundedBorder)
                        }
                        
                        // Error / Success
                        if let error = vm.error {
                            Label(error, systemImage: "exclamationmark.triangle.fill")
                                .font(.caption)
                                .foregroundStyle(.red)
                        }
                        if let success = vm.success {
                            Label(success, systemImage: "checkmark.circle.fill")
                                .font(.caption)
                                .foregroundStyle(.green)
                        }
                        
                        // Submit
                        Button(action: { Task { await vm.submit() } }) {
                            HStack {
                                if vm.loading {
                                    ProgressView()
                                }
                                Text(buttonLabel)
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .disabled(vm.loading)
                        
                        // Links
                        if vm.mode == .login {
                            Button("Password dimenticata?") {
                                vm.mode = .forgot
                                vm.resetEmail = vm.email
                            }
                            .font(.caption)
                        }
                        if vm.mode == .forgot || vm.mode == .reset {
                            Button("← Torna al login") { vm.mode = .login }
                                .font(.caption)
                        }
                    }
                    .padding(24)
                    .background(.regularMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 24))
                    
                    Text("Database condiviso su Turso — i tuoi dati sono al sicuro")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .padding(24)
            }
        }
    }
    
    private var subtitle: String {
        switch vm.mode {
        case .login: return "Accedi con il tuo account"
        case .register: return "Crea un nuovo account"
        case .forgot: return "Recupera la password"
        case .reset: return "Reimposta la password"
        }
    }
    
    private var buttonLabel: String {
        switch vm.mode {
        case .login: return "🔓 Accedi"
        case .register: return "✨ Crea account"
        case .forgot: return "📧 Invia token di reset"
        case .reset: return "🔐 Reimposta password"
        }
    }
}
