package com.eos.smartworking.ui.settings

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = viewModel()
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("⚙️ Impostazioni") },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            if (state.loading) {
                Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                return@Column
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(28.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    // Header
                    Icon(Icons.Default.Settings, null, modifier = Modifier.size(40.dp), tint = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.height(8.dp))
                    Text("Impostazioni", style = MaterialTheme.typography.headlineMedium)
                    Text(
                        "Il tuo profilo è salvato nel database e condiviso tra tutti i dispositivi",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(Modifier.height(24.dp))

                    // Email (readonly)
                    OutlinedTextField(
                        value = state.profile?.email ?: state.userEmail,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("📧 Email di login") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    Text("La tua email di accesso. Cambiala nella sezione sotto.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

                    Spacer(Modifier.height(16.dp))

                    // Nome
                    OutlinedTextField(
                        value = state.displayName,
                        onValueChange = viewModel::updateDisplayName,
                        label = { Text("👤 Nome visualizzato") },
                        placeholder = { Text("es. Ricardo Quintero") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    Text("Come apparirai nella vista team", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

                    Spacer(Modifier.height(16.dp))

                    // Sede
                    var locationExpanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(expanded = locationExpanded, onExpandedChange = { locationExpanded = it }) {
                        OutlinedTextField(
                            value = state.locationCode.let { if (it.isNotEmpty()) it.lowercase().replaceFirstChar { c -> c.uppercase() } else "" },
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("📍 Sede") },
                            modifier = Modifier.fillMaxWidth().menuAnchor(),
                            shape = RoundedCornerShape(12.dp),
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = locationExpanded) }
                        )
                        ExposedDropdownMenu(expanded = locationExpanded, onDismissRequest = { locationExpanded = false }) {
                            viewModel.locations.forEach { loc ->
                                DropdownMenuItem(
                                    text = { Text(loc.lowercase().replaceFirstChar { it.uppercase() }) },
                                    onClick = { viewModel.updateLocationCode(loc); locationExpanded = false }
                                )
                            }
                        }
                    }
                    Text("Determina quali colleghi vedi nella vista team", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

                    Spacer(Modifier.height(16.dp))

                    // Employee ID (readonly + copy)
                    OutlinedTextField(
                        value = state.profile?.employeeId ?: state.userId,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("🆔 ID Dipendente") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        trailingIcon = {
                            IconButton(onClick = {
                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                clipboard.setPrimaryClip(ClipData.newPlainText("Employee ID", state.profile?.employeeId ?: state.userId))
                            }) {
                                Icon(Icons.Default.ContentCopy, "Copia")
                            }
                        }
                    )
                    Text("Il tuo identificativo unico e permanente. Corrisponde al tuo ID su database.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

                    Spacer(Modifier.height(16.dp))

                    // Dipartimento (readonly)
                    OutlinedTextField(
                        value = state.profile?.department ?: "IT",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("🏢 Dipartimento") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    // Messaggi
                    state.saveMsg?.let {
                        Spacer(Modifier.height(12.dp))
                        Text(it, color = if (state.saveSuccess) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }

                    Spacer(Modifier.height(16.dp))

                    // Salva
                    Button(
                        onClick = viewModel::saveProfile,
                        enabled = !state.saving,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Text(if (state.saving) "⏳ Salvataggio..." else "💾 Salva nel database")
                    }

                    // ── Cambio Email ──
                    Spacer(Modifier.height(24.dp))
                    HorizontalDivider()
                    Spacer(Modifier.height(16.dp))

                    Text("📧 Cambia email", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        "Email attuale: ${state.profile?.email ?: state.userEmail}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(Modifier.height(12.dp))

                    OutlinedTextField(
                        value = state.newEmail,
                        onValueChange = viewModel::updateNewEmail,
                        label = { Text("Nuova email") },
                        placeholder = { Text("nuova@email.com") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(Modifier.height(12.dp))

                    OutlinedTextField(
                        value = state.currentPassword,
                        onValueChange = viewModel::updateCurrentPassword,
                        label = { Text("🔒 Password attuale (per confermare)") },
                        placeholder = { Text("••••••••") },
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    state.emailMsg?.let {
                        Spacer(Modifier.height(8.dp))
                        Text(it, color = if (state.emailSuccess) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }

                    Spacer(Modifier.height(12.dp))

                    OutlinedButton(
                        onClick = viewModel::changeEmail,
                        enabled = !state.emailLoading,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Text(if (state.emailLoading) "⏳ Aggiornamento..." else "📧 Cambia email")
                    }

                    // Info
                    Spacer(Modifier.height(24.dp))
                    HorizontalDivider()
                    Spacer(Modifier.height(16.dp))

                    Text("ℹ️ Come funziona", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Text("• Il tuo profilo è salvato su Turso (SQLite nel cloud)")
                    Text("• L'ID dipendente è fisso e unico — lo stesso su ogni dispositivo")
                    Text("• Nome e sede determinano cosa vedi nella vista team")
                    Text("• Per cambiare email serve la password attuale come verifica di sicurezza")
                }
            }
        }
    }
}
