import SwiftUI

// MARK: - Auth View
struct AuthView: View {
    @StateObject private var vm = AuthViewModel()
    var onLoginSuccess: () -> Void
    
    var body: some View {
        if vm.loggedInUser != nil {
            Color.clear.onAppear { onLoginSuccess() }
        } else {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 28) {
                    Spacer().frame(height: 40)
                    
                    // Icon inside a glowing glass circle
                    ZStack {
                        Circle()
                            .fill(.ultraThinMaterial)
                            .frame(width: 96, height: 96)
                            .overlay(
                                Circle()
                                    .stroke(
                                        LinearGradient(
                                            colors: [Color.white.opacity(0.45), Color.white.opacity(0.1)],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        ),
                                        lineWidth: 1.5
                                    )
                            )
                            .shadow(color: Color.green.opacity(0.25), radius: 15, x: 0, y: 8)
                        
                        Image(systemName: "lock.shield.fill")
                            .font(.system(size: 42))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [.green, .mint],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    }
                    
                    VStack(spacing: 8) {
                        Text("EOS Smart Working")
                            .font(.system(size: 30, weight: .bold, design: .rounded))
                            .foregroundStyle(.primary)
                        
                        Text(subtitle)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    
                    // Card con stile vetro liquido
                    VStack(spacing: 22) {
                        // Tabs
                        if vm.mode == .login || vm.mode == .register {
                            Picker("Mode", selection: $vm.mode) {
                                Text("🔑 Accedi").tag(AuthViewModel.AuthMode.login)
                                Text("✨ Registrati").tag(AuthViewModel.AuthMode.register)
                            }
                            .pickerStyle(.segmented)
                            .padding(.bottom, 4)
                        }
                        
                        // Campi comuni
                        if vm.mode == .login || vm.mode == .register {
                            VStack(spacing: 12) {
                                TextField("📧 Email", text: $vm.email)
                                    .textContentType(.emailAddress)
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                                    .padding(14)
                                    .background(.ultraThinMaterial)
                                    .cornerRadius(14)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.white.opacity(0.18), lineWidth: 1)
                                    )
                                
                                SecureField("🔒 Password", text: $vm.password)
                                    .padding(14)
                                    .background(.ultraThinMaterial)
                                    .cornerRadius(14)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.white.opacity(0.18), lineWidth: 1)
                                    )
                            }
                        }
                        
                        // Registrazione
                        if vm.mode == .register {
                            VStack(spacing: 12) {
                                TextField("👤 Nome completo", text: $vm.name)
                                    .padding(14)
                                    .background(.ultraThinMaterial)
                                    .cornerRadius(14)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.white.opacity(0.18), lineWidth: 1)
                                    )
                                
                                HStack {
                                    Text("Dipartimento: **LABS**")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                }
                                .padding(.horizontal, 4)
                                
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("📍 Sede di lavoro")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .padding(.leading, 4)
                                    
                                    Picker("📍 Sede", selection: $vm.location) {
                                        Text("-- Seleziona sede --").tag("")
                                        ForEach(vm.locations, id: \.self) { loc in
                                            Text(loc.capitalized).tag(loc)
                                        }
                                    }
                                    .pickerStyle(.menu)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(8)
                                    .background(.ultraThinMaterial)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.white.opacity(0.15), lineWidth: 1)
                                    )
                                }
                            }
                        }
                        
                        // Forgot
                        if vm.mode == .forgot {
                            VStack(spacing: 12) {
                                Text("Inserisci la tua email. Riceverai un token per reimpostare la password.")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .multilineTextAlignment(.center)
                                
                                TextField("📧 Email", text: $vm.resetEmail)
                                    .textContentType(.emailAddress)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                                    .padding(14)
                                    .background(.ultraThinMaterial)
                                    .cornerRadius(14)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.white.opacity(0.18), lineWidth: 1)
                                    )
                            }
                        }
                        
                        // Reset
                        if vm.mode == .reset {
                            VStack(spacing: 12) {
                                TextField("📧 Email", text: $vm.resetEmail)
                                    .autocapitalization(.none)
                                    .padding(14)
                                    .background(.ultraThinMaterial)
                                    .cornerRadius(14)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.white.opacity(0.18), lineWidth: 1)
                                    )
                                TextField("🔑 Token di reset", text: $vm.resetToken)
                                    .padding(14)
                                    .background(.ultraThinMaterial)
                                    .cornerRadius(14)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.white.opacity(0.18), lineWidth: 1)
                                    )
                                SecureField("🔒 Nuova password", text: $vm.newPassword)
                                    .padding(14)
                                    .background(.ultraThinMaterial)
                                    .cornerRadius(14)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.white.opacity(0.18), lineWidth: 1)
                                    )
                            }
                        }
                        
                        // Error / Success
                        if let error = vm.error {
                            Label(error, systemImage: "exclamationmark.triangle.fill")
                                .font(.caption)
                                .foregroundStyle(.red)
                                .padding(.vertical, 2)
                        }
                        if let success = vm.success {
                            Label(success, systemImage: "checkmark.circle.fill")
                                .font(.caption)
                                .foregroundStyle(.green)
                                .padding(.vertical, 2)
                        }
                        
                        // Submit
                        Button(action: { Task { await vm.submit() } }) {
                            HStack {
                                if vm.loading {
                                    ProgressView()
                                        .tint(.white)
                                        .padding(.trailing, 8)
                                }
                                Text(buttonLabel)
                                    .font(.headline)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(
                                LinearGradient(
                                    colors: [.green, .mint],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .foregroundColor(.white)
                            .clipShape(Capsule())
                            .shadow(color: Color.green.opacity(0.3), radius: 8, x: 0, y: 4)
                        }
                        .disabled(vm.loading)
                        .buttonStyle(.plain)
                        
                        // Links
                        if vm.mode == .login {
                            Button("Password dimenticata?") {
                                vm.mode = .forgot
                                vm.resetEmail = vm.email
                            }
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.accentColor)
                        }
                        if vm.mode == .forgot || vm.mode == .reset {
                            Button("← Torna al login") { vm.mode = .login }
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.accentColor)
                        }
                    }
                    .padding(24)
                    .background(.regularMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 28))
                    .overlay(
                        RoundedRectangle(cornerRadius: 28)
                            .stroke(
                                LinearGradient(
                                    colors: [Color.white.opacity(0.35), Color.white.opacity(0.08)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1.5
                            )
                    )
                    .shadow(color: Color.black.opacity(0.12), radius: 20, x: 0, y: 10)
                    
                    Text("Database condiviso su Turso — i tuoi dati sono al sicuro")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    
                    Spacer().frame(height: 20)
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
