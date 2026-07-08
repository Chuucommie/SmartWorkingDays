package com.eos.smartworking.ui.planner

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.eos.smartworking.logic.SmartWorkingEngine
import com.eos.smartworking.model.DayState
import com.eos.smartworking.model.Permutation
import com.eos.smartworking.util.DateUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlannerScreen(
    onNavigateToTeam: () -> Unit,
    viewModel: PlannerViewModel = viewModel()
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("📅 Pianifica") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Text(
                "Smart Working",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                "Configura i vincoli e scegli la tua settimana",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "${state.displayName} · ${state.locationCode}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary
            )

            Spacer(Modifier.height(20.dp))

            // Card principale
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(28.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {

                    // ── Regola SW ──
                    Text("REGOLA SMART WORKING", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(8.dp))
                    var ruleExpanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(expanded = ruleExpanded, onExpandedChange = { ruleExpanded = it }) {
                        OutlinedTextField(
                            value = viewModel.ruleOptions.find { it.first == state.selectedRule }?.second ?: "",
                            onValueChange = {},
                            readOnly = true,
                            modifier = Modifier.fillMaxWidth().menuAnchor(),
                            shape = RoundedCornerShape(24.dp),
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = ruleExpanded) }
                        )
                        ExposedDropdownMenu(expanded = ruleExpanded, onDismissRequest = { ruleExpanded = false }) {
                            viewModel.ruleOptions.forEach { (key, label) ->
                                DropdownMenuItem(text = { Text(label) }, onClick = { viewModel.setRule(key); ruleExpanded = false })
                            }
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    // ── Selettore Settimana ──
                    Text("SETTIMANA DI PIANIFICAZIONE", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        IconButton(onClick = { viewModel.changeWeek(-1) }, modifier = Modifier.size(40.dp)) {
                            Icon(Icons.Default.ChevronLeft, "Precedente")
                        }
                        Surface(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(24.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Text(
                                DateUtils.formatWeekRange(state.weekStart),
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                                textAlign = TextAlign.Center,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        IconButton(onClick = { viewModel.changeWeek(1) }, modifier = Modifier.size(40.dp)) {
                            Icon(Icons.Default.ChevronRight, "Successiva")
                        }
                        IconButton(onClick = { viewModel.goToCurrentWeek() }, modifier = Modifier.size(40.dp)) {
                            Icon(Icons.Default.Today, "Oggi")
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    // ── Selettore Giorni ──
                    Text("CONFIGURA SETTIMANA", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("clicca per cambiare stato", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(8.dp))

                    val dayLabels = listOf("Lun", "Mar", "Mer", "Gio", "Ven")
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        state.dayStates.forEachIndexed { i, dayState ->
                            DayPill(
                                label = dayLabels[i],
                                state = dayState,
                                onClick = { viewModel.cycleDay(i) }
                            )
                        }
                    }

                    Spacer(Modifier.height(8.dp))
                    // Legenda
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text("🏠 SW  ", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        Text("🏢 Ufficio  ", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                        Text("✕ Assenza  ", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
                        Text("◌ Libero", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }

                    Spacer(Modifier.height(16.dp))
                    HorizontalDivider()
                    Spacer(Modifier.height(16.dp))

                    // ── Riepilogo ──
                    val workedCount = state.dayStates.count { it != DayState.ABSENT }
                    val target = SmartWorkingEngine.computeTarget(viewModel.swRule, workedCount)
                    val ruleDesc = SmartWorkingEngine.describeSwRule(viewModel.swRule)

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Giorni lavorati", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("$workedCount/5", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                    }
                    Spacer(Modifier.height(4.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Regola SW", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(ruleDesc, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                    }

                    Spacer(Modifier.height(12.dp))

                    // ── Result Pill ──
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(20.dp))
                            .background(
                                Brush.horizontalGradient(listOf(Color(0xFF34C759), Color(0xFF007AFF)))
                            )
                            .padding(20.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("SMART WORKING", fontSize = 10.sp, color = Color.White.copy(alpha = 0.6f))
                                Text(
                                    String.format("%.1f", target.targetSW),
                                    fontSize = 36.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text("massimo", fontSize = 10.sp, color = Color.White.copy(alpha = 0.4f))
                            }
                            Box(modifier = Modifier.width(1.dp).height(60.dp).background(Color.White.copy(alpha = 0.2f)))
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("UFFICIO", fontSize = 10.sp, color = Color.White.copy(alpha = 0.6f))
                                Text(
                                    String.format("%.1f", target.targetOffice),
                                    fontSize = 36.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text("minimo", fontSize = 10.sp, color = Color.White.copy(alpha = 0.4f))
                            }
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    // ── Permutazioni ──
                    if (state.permutations.isNotEmpty()) {
                        val validPerms = state.permutations.filter { it.valid }
                        Text(
                            "COMBINAZIONI",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                "${validPerms.size} valide / ${state.permutations.size} totali",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        Spacer(Modifier.height(8.dp))

                        state.permutations.forEachIndexed { idx, perm ->
                            PermutationRow(
                                index = idx + 1,
                                perm = perm,
                                isSelected = state.selectedPerm == idx,
                                onClick = { viewModel.selectPerm(idx) }
                            )
                            Spacer(Modifier.height(4.dp))
                        }
                    }

                    // ── Piano esistente ──
                    if (state.planLoading) {
                        Spacer(Modifier.height(12.dp))
                        Text("⏳ Caricamento piano esistente...", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }

                    state.existingPlan?.let { plan ->
                        Spacer(Modifier.height(12.dp))
                        HorizontalDivider()
                        Spacer(Modifier.height(12.dp))
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("✅ Piano già inviato per questa settimana", fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.primary)
                                Spacer(Modifier.height(8.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    plan.week.forEach { s ->
                                        val icon = when (s) {
                                            DayState.SW -> "🏠"
                                            DayState.OFFICE -> "🏢"
                                            DayState.ABSENT -> "✕"
                                            else -> "◌"
                                        }
                                        Text(icon, fontSize = 18.sp)
                                    }
                                }
                                Spacer(Modifier.height(12.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(
                                        onClick = { viewModel.editExisting() },
                                        modifier = Modifier.weight(1f),
                                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
                                    ) { Text("✏️ Modifica") }
                                    Button(
                                        onClick = { viewModel.deletePlan() },
                                        modifier = Modifier.weight(1f),
                                        enabled = !state.deleting,
                                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                                    ) { Text(if (state.deleting) "⏳..." else "🗑️ Cancella") }
                                }
                                state.deleteMsg?.let {
                                    Text(it, color = if (state.deleteSuccess) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }

                    // ── Azioni (nuovo invio) ──
                    if (state.existingPlan == null && !state.planLoading && state.selectedPerm != null) {
                        val perm = state.permutations.getOrNull(state.selectedPerm!!)
                        if (perm != null && perm.valid) {
                            Spacer(Modifier.height(12.dp))
                            HorizontalDivider()
                            Spacer(Modifier.height(12.dp))

                            // Salva
                            if (!state.saving) {
                                OutlinedButton(
                                    onClick = { viewModel.setSaving(true) },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(24.dp)
                                ) { Text("💾 Salva combinazione") }
                            } else {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(
                                        value = state.saveName,
                                        onValueChange = viewModel::updateSaveName,
                                        placeholder = { Text("Nome...") },
                                        singleLine = true,
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(24.dp)
                                    )
                                    IconButton(onClick = { /* save */ viewModel.setSaving(false) }) {
                                        Icon(Icons.Default.Check, "OK", tint = MaterialTheme.colorScheme.primary)
                                    }
                                    IconButton(onClick = { viewModel.setSaving(false) }) {
                                        Icon(Icons.Default.Close, "Annulla")
                                    }
                                }
                            }

                            Spacer(Modifier.height(8.dp))

                            // Invia
                            Button(
                                onClick = { viewModel.publish() },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !state.publishing,
                                shape = RoundedCornerShape(24.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
                            ) {
                                Text(if (state.publishing) "⏳ Invio in corso..." else "📤 Invia pianificazione")
                            }

                            state.publishMsg?.let {
                                Text(it, color = if (state.publishSuccess) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }

                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Regola: $ruleDesc · Puoi fare meno SW del target",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Link navigazione
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                TextButton(onClick = onNavigateToTeam) { Text("👥 Vedi team") }
                TextButton(onClick = {}) { Text("💾 Salvate") }
            }
            Text(
                "SmartWorkingDays · IgelDev",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
            )
        }
    }
}

// ── Componenti ──

@Composable
fun DayPill(label: String, state: DayState, onClick: () -> Unit) {
    val (icon, bgColor) = when (state) {
        DayState.FREE -> "◌" to MaterialTheme.colorScheme.surfaceVariant
        DayState.SW -> "🏠" to MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
        DayState.OFFICE -> "🏢" to MaterialTheme.colorScheme.secondary.copy(alpha = 0.15f)
        DayState.ABSENT -> "✕" to MaterialTheme.colorScheme.error.copy(alpha = 0.15f)
        DayState.HALF -> "◐" to MaterialTheme.colorScheme.tertiary.copy(alpha = 0.15f)
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(bgColor)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp)
    ) {
        Text(icon, fontSize = 22.sp)
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun PermutationRow(index: Int, perm: Permutation, isSelected: Boolean, onClick: () -> Unit) {
    val pct = (perm.adherence * 100).toInt()
    val adherenceEmoji = when {
        perm.adherence >= 0.99 -> "🟢"
        perm.adherence >= 0.75 -> "🟡"
        perm.adherence >= 0.4 -> "🟠"
        else -> "🔴"
    }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = perm.valid, onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        border = if (isSelected) BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else null
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("$index", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(24.dp))
            Row(modifier = Modifier.weight(1f), horizontalArrangement = Arrangement.Center) {
                perm.week.forEach { s ->
                    val icon = when (s) {
                        DayState.SW -> "🏠"
                        DayState.OFFICE -> "🏢"
                        DayState.ABSENT -> "✕"
                        DayState.HALF -> "◐"
                        else -> "◌"
                    }
                    Text(icon, fontSize = 14.sp, modifier = Modifier.padding(horizontal = 2.dp))
                }
            }
            Text("🏠${String.format("%.1f", perm.totalSW)}", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
            Text(" · ", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("🏢${String.format("%.1f", perm.totalOffice)}", fontSize = 12.sp, color = MaterialTheme.colorScheme.secondary)
            Spacer(Modifier.width(8.dp))
            Text("$adherenceEmoji $pct%", fontSize = 11.sp)
            if (isSelected) Icon(Icons.Default.Check, "Selezionato", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
        }
    }
}
