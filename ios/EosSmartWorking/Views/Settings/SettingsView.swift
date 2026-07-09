import SwiftUI

// MARK: - Settings View
struct SettingsView: View {
    @StateObject private var vm = SettingsViewModel()
    
    var body: some View {
        ZStack(alignment: .top) {
            ScrollView(showsIndicators: false) {
                if vm.loading {
                    VStack {
                        Spacer().frame(height: 100)
                        ProgressView("Caricamento...")
                            .padding(32)
                    }
                } else {
                    VStack(spacing: 16) {
                        Spacer().frame(height: 64) // Spacer per la barra di navigazione
                        
                        // Card
                        VStack(spacing: 16) {
                            // Email (readonly)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("📧 Email di login").font(.caption).foregroundStyle(.secondary)
                                Text(vm.profile?.email ?? vm.userEmail)
                                    .padding(12)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(.quaternary)
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                Text("La tua email di accesso. Cambiala nella sezione sotto.")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            
                            // Nome
                            VStack(alignment: .leading, spacing: 4) {
                                Text("👤 Nome visualizzato").font(.caption).foregroundStyle(.secondary)
                                TextField("es. Ricardo Quintero", text: $vm.displayName)
                                    .textFieldStyle(.roundedBorder)
                                Text("Come apparirai nella vista team")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            
                            // Sede
                            VStack(alignment: .leading, spacing: 4) {
                                Text("📍 Sede").font(.caption).foregroundStyle(.secondary)
                                Picker("Sede", selection: $vm.locationCode) {
                                    Text("-- Seleziona sede --").tag("")
                                    ForEach(vm.locations, id: \.self) { loc in
                                        Text(loc.capitalized).tag(loc)
                                    }
                                }
                                .pickerStyle(.menu)
                                Text("Determina quali colleghi vedi nella vista team")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            
                            // Employee ID (readonly + copy)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("🆔 ID Dipendente").font(.caption).foregroundStyle(.secondary)
                                HStack {
                                    Text(vm.profile?.employeeId ?? vm.userId)
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                    Button {
                                        UIPasteboard.general.string = vm.profile?.employeeId ?? vm.userId
                                    } label: {
                                        Image(systemName: "doc.on.doc")
                                    }
                                }
                                .padding(12)
                                .background(.quaternary)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                Text("Il tuo identificativo unico e permanente.")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            
                            // Dipartimento (readonly)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("🏢 Dipartimento").font(.caption).foregroundStyle(.secondary)
                                Text(vm.profile?.department ?? "IT")
                                    .padding(12)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(.quaternary)
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                            
                            // Messaggi
                            if let msg = vm.saveMsg {
                                Label(msg, systemImage: vm.saveSuccess ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                                    .font(.caption)
                                    .foregroundStyle(vm.saveSuccess ? .green : .red)
                            }
                            
                            // Salva
                            Button { Task { await vm.saveProfile() } } label: {
                                HStack {
                                    if vm.saving { ProgressView() }
                                    Text("💾 Salva nel database")
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(vm.saving)
                            
                            Divider()
                            
                            // Cambio Email
                            VStack(alignment: .leading, spacing: 12) {
                                Text("📧 Cambia email")
                                    .font(.headline)
                                Text("Email attuale: **\(vm.profile?.email ?? vm.userEmail)**")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                
                                TextField("Nuova email", text: $vm.newEmail)
                                    .textContentType(.emailAddress)
                                    .keyboardType(.emailAddress)
                                    .textFieldStyle(.roundedBorder)
                                
                                SecureField("🔒 Password attuale (per confermare)", text: $vm.currentPassword)
                                    .textFieldStyle(.roundedBorder)
                                
                                if let msg = vm.emailMsg {
                                    Label(msg, systemImage: vm.emailSuccess ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                                        .font(.caption)
                                        .foregroundStyle(vm.emailSuccess ? .green : .red)
                                }
                                
                                Button { Task { await vm.changeEmail() } } label: {
                                    HStack {
                                        if vm.emailLoading { ProgressView() }
                                        Text("📧 Cambia email")
                                    }
                                    .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(.bordered)
                                .disabled(vm.emailLoading)
                            }
                            
                            Divider()
                            
                            // Info
                            VStack(alignment: .leading, spacing: 8) {
                                Text("ℹ️ Come funziona")
                                    .font(.headline)
                                Text("• Il tuo profilo è salvato su **Turso** (SQLite nel cloud)")
                                Text("• L'ID dipendente è fisso e unico — lo stesso su ogni dispositivo")
                                Text("• Nome e sede determinano cosa vedi nella vista team")
                                Text("• Per cambiare email serve la password attuale come verifica di sicurezza")
                            }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        }
                        .padding(24)
                        .background(.regularMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 28))
                        .overlay(
                            RoundedRectangle(cornerRadius: 28)
                                .stroke(
                                    LinearGradient(
                                        colors: [Color.white.opacity(0.3), Color.white.opacity(0.08)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    lineWidth: 1.5
                                )
                        )
                        
                        Spacer().frame(height: 100) // Spacer per evitare la tab bar fluttuante
                    }
                    .padding(16)
                }
            }
            
            LiquidGlassNavigationBar(
                title: "Impostazioni",
                subtitle: "Profilo e sincronizzazione"
            )
        }
    }
}
