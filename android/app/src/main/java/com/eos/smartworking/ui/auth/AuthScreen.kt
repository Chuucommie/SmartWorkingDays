package com.eos.smartworking.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthScreen(
    onLoginSuccess: () -> Unit,
    viewModel: AuthViewModel = viewModel()
) {
    val state by viewModel.state.collectAsState()

    // Se già loggato, vai avanti
    LaunchedEffect(state.loggedInUser) {
        if (state.loggedInUser != null) onLoginSuccess()
    }

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Icon
            Icon(
                imageVector = Icons.Default.Lock,
                contentDescription = null,
                modifier = Modifier.size(56.dp),
                tint = MaterialTheme.colorScheme.primary
            )

            Spacer(Modifier.height(16.dp))

            Text(
                "EOS Smart Working",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(Modifier.height(8.dp))

            Text(
                when (state.mode) {
                    AuthMode.LOGIN -> "Accedi con il tuo account"
                    AuthMode.REGISTER -> "Crea un nuovo account"
                    AuthMode.FORGOT -> "Recupera la password"
                    AuthMode.RESET -> "Reimposta la password"
                },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(Modifier.height(32.dp))

            // Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.extraLarge,
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {

                    // Tabs Login/Register
                    if (state.mode == AuthMode.LOGIN || state.mode == AuthMode.REGISTER) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            FilterChip(
                                selected = state.mode == AuthMode.LOGIN,
                                onClick = { viewModel.setMode(AuthMode.LOGIN) },
                                label = { Text("🔑 Accedi") },
                                modifier = Modifier.weight(1f)
                            )
                            FilterChip(
                                selected = state.mode == AuthMode.REGISTER,
                                onClick = { viewModel.setMode(AuthMode.REGISTER) },
                                label = { Text("✨ Registrati") },
                                modifier = Modifier.weight(1f)
                            )
                        }
                        Spacer(Modifier.height(20.dp))
                    }

                    // Campi comuni
                    if (state.mode == AuthMode.LOGIN || state.mode == AuthMode.REGISTER) {
                        OutlinedTextField(
                            value = state.email,
                            onValueChange = viewModel::updateEmail,
                            label = { Text("📧 Email") },
                            placeholder = { Text("tuo@email.com") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(Modifier.height(12.dp))

                        OutlinedTextField(
                            value = state.password,
                            onValueChange = viewModel::updatePassword,
                            label = { Text("🔒 Password") },
                            placeholder = { Text("••••••••") },
                            visualTransformation = PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(Modifier.height(12.dp))
                    }

                    // Campi registrazione
                    if (state.mode == AuthMode.REGISTER) {
                        OutlinedTextField(
                            value = state.name,
                            onValueChange = viewModel::updateName,
                            label = { Text("👤 Nome completo") },
                            placeholder = { Text("Mario Rossi") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(Modifier.height(12.dp))

                        Text("Dipartimento: LABS", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(12.dp))

                        // Sede dropdown
                        var expanded by remember { mutableStateOf(false) }
                        val locations = listOf("TREVISO", "BOLOGNA", "MILANO")
                        ExposedDropdownMenuBox(
                            expanded = expanded,
                            onExpandedChange = { expanded = it }
                        ) {
                            OutlinedTextField(
                                value = state.location.let { if (it.isNotEmpty()) it.lowercase().replaceFirstChar { c -> c.uppercase() } else "" },
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("📍 Sede") },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor()
                            )
                            ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                locations.forEach { loc ->
                                    DropdownMenuItem(
                                        text = { Text(loc.lowercase().replaceFirstChar { c -> c.uppercase() }) },
                                        onClick = { viewModel.updateLocation(loc); expanded = false }
                                    )
                                }
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                    }

                    // Forgot password
                    if (state.mode == AuthMode.FORGOT) {
                        Text(
                            "Inserisci la tua email. Riceverai un token per reimpostare la password.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(12.dp))
                        OutlinedTextField(
                            value = state.resetEmail,
                            onValueChange = viewModel::updateResetEmail,
                            label = { Text("📧 Email") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(Modifier.height(12.dp))
                    }

                    // Reset password
                    if (state.mode == AuthMode.RESET) {
                        OutlinedTextField(
                            value = state.resetEmail,
                            onValueChange = viewModel::updateResetEmail,
                            label = { Text("📧 Email") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(Modifier.height(12.dp))
                        OutlinedTextField(
                            value = state.resetToken,
                            onValueChange = viewModel::updateResetToken,
                            label = { Text("🔑 Token di reset") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(Modifier.height(12.dp))
                        OutlinedTextField(
                            value = state.newPassword,
                            onValueChange = viewModel::updateNewPassword,
                            label = { Text("🔒 Nuova password") },
                            visualTransformation = PasswordVisualTransformation(),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(Modifier.height(12.dp))
                    }

                    // Error / Success
                    state.error?.let {
                        Text("⚠️ $it", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                        Spacer(Modifier.height(8.dp))
                    }
                    state.success?.let {
                        Text("✅ $it", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
                        Spacer(Modifier.height(8.dp))
                    }

                    // Submit button
                    Button(
                        onClick = viewModel::submit,
                        enabled = !state.loading,
                        modifier = Modifier.fillMaxWidth(),
                        shape = MaterialTheme.shapes.large
                    ) {
                        if (state.loading) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                        } else {
                            Text(when (state.mode) {
                                AuthMode.LOGIN -> "🔓 Accedi"
                                AuthMode.REGISTER -> "✨ Crea account"
                                AuthMode.FORGOT -> "📧 Invia token di reset"
                                AuthMode.RESET -> "🔐 Reimposta password"
                            })
                        }
                    }

                    // Link forgot password / back
                    Spacer(Modifier.height(12.dp))
                    if (state.mode == AuthMode.LOGIN) {
                        TextButton(onClick = {
                            viewModel.setMode(AuthMode.FORGOT)
                            viewModel.updateResetEmail(state.email)
                        }) {
                            Text("Password dimenticata?")
                        }
                    }
                    if (state.mode == AuthMode.FORGOT || state.mode == AuthMode.RESET) {
                        TextButton(onClick = { viewModel.setMode(AuthMode.LOGIN) }) {
                            Text("← Torna al login")
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
            Text(
                "Database condiviso su Turso — i tuoi dati sono al sicuro",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }
    }
}
