package com.eosprod.smartworkingdays.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.eosprod.smartworkingdays.engine.SmartWorkingEngine
import com.eosprod.smartworkingdays.engine.TimesheetEngine
import com.eosprod.smartworkingdays.models.*
import com.eosprod.smartworkingdays.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SmartWorkingScreen(
    onNavigateToTimesheet: (Timesheet) -> Unit
) {
    var dayStates by remember { mutableStateOf(listOf(DayState.FREE, DayState.FREE, DayState.FREE, DayState.FREE, DayState.FREE)) }
    var selectedRuleIndex by remember { mutableIntStateOf(0) }
    var selectedPermutation by remember { mutableStateOf<Int?>(null) }
    var showAll by remember { mutableStateOf(false) }
    var isSaving by remember { mutableStateOf(false) }
    var saveName by remember { mutableStateOf("") }
    var saveMessage by remember { mutableStateOf<Pair<String, String>?>(null) }
    var releaseMessage by remember { mutableStateOf<String?>(null) }

    val ruleOptions = listOf(
        SwRule.Percentage(60.0),
        SwRule.Percentage(40.0),
        SwRule.Fixed(2.0),
        SwRule.Fixed(3.0)
    )
    val ruleLabels = listOf("60% Smart Working", "40% Smart Working", "Max 2 giorni SW", "Max 3 giorni SW")
    val currentRule = ruleOptions[selectedRuleIndex]
    val userProfile = UserProfile()

    val workedCount = dayStates.count { it.isWorkingDay }
    val (targetSW, targetOffice) = currentRule.computeTarget(workedCount)

    val permutations = remember(dayStates, selectedRuleIndex) {
        SmartWorkingEngine.generateAllPermutations(dayStates, currentRule)
    }
    val validPermutations = permutations.filter { it.valid }

    fun cycleState(index: Int) {
        val order = listOf(DayState.FREE, DayState.SW, DayState.OFFICE, DayState.ABSENT)
        val currentIdx = order.indexOf(dayStates[index])
        dayStates = dayStates.toMutableList().also { it[index] = order[(currentIdx + 1) % order.size] }
        selectedPermutation = null
    }

    fun adherenceBadge(adherence: Double): Triple<String, String, Color> = when {
        adherence >= 0.99 -> Triple("🟢", "Ottimale", GreenPrimary)
        adherence >= 0.75 -> Triple("🟡", "Buono", Color(0xFFFFCC00))
        adherence >= 0.4 -> Triple("🟠", "Parziale", OrangePrimary)
        else -> Triple("🔴", "Minimo", RedPrimary)
    }

    Scaffold(
        containerColor = LightBackground
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            item {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(top = 24.dp)) {
                    Box(
                        modifier = Modifier.size(56.dp).clip(RoundedCornerShape(24.dp))
                            .background(Brush.linearGradient(listOf(GreenPrimary, GreenDark))),
                        contentAlignment = Alignment.Center
                    ) { Text("📅", fontSize = 24.sp) }
                    Spacer(Modifier.height(8.dp))
                    Text("Smart Working", fontSize = 26.sp, fontWeight = FontWeight.SemiBold, color = LightTextPrimary)
                    Text(userProfile.employeeName, fontSize = 14.sp, color = LightTextSecondary)
                }
            }

            // Main Card
            item {
                Card(
                    shape = RoundedCornerShape(28.dp),
                    colors = CardDefaults.cardColors(containerColor = LightCard),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        // Rule dropdown
                        Text("REGOLA SMART WORKING", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = LightTextSecondary)
                        var expanded by remember { mutableStateOf(false) }
                        Box {
                            OutlinedButton(onClick = { expanded = true }, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                                Text(ruleLabels[selectedRuleIndex], modifier = Modifier.weight(1f), fontSize = 14.sp)
                            }
                            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                ruleLabels.forEachIndexed { i, label ->
                                    DropdownMenuItem(text = { Text(label) }, onClick = { selectedRuleIndex = i; expanded = false; selectedPermutation = null })
                                }
                            }
                        }

                        // Day selector
                        Text("CONFIGURA SETTIMANA", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = LightTextSecondary)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            DAY_NAMES_SHORT.forEachIndexed { i, label ->
                                val state = dayStates[i]
                                val bgColor = when (state) {
                                    DayState.SW -> GreenPrimary.copy(alpha = 0.12f)
                                    DayState.OFFICE -> BluePrimary.copy(alpha = 0.12f)
                                    DayState.ABSENT -> RedPrimary.copy(alpha = 0.12f)
                                    DayState.HALF -> OrangePrimary.copy(alpha = 0.12f)
                                    else -> Color(0xFFE5E5EA)
                                }
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).background(bgColor).clickable { cycleState(i) }.padding(vertical = 8.dp)
                                ) {
                                    if (state != DayState.FREE) Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(when(state) { DayState.SW -> GreenPrimary; DayState.OFFICE -> BluePrimary; DayState.ABSENT -> RedPrimary; else -> OrangePrimary }))
                                    else Spacer(Modifier.height(6.dp))
                                    Text(state.icon, fontSize = 18.sp)
                                    Text(label, fontSize = 12.sp)
                                }
                            }
                        }

                        // Legend
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            LegendChip("🏠", "SW", GreenPrimary)
                            LegendChip("🏢", "Ufficio", BluePrimary)
                            LegendChip("✕", "Assenza", RedPrimary)
                            Text("◌ Libero", fontSize = 11.sp, color = LightTextSecondary, modifier = Modifier.align(Alignment.CenterVertically))
                        }

                        HorizontalDivider()

                        // Summary
                        SummaryRow("Giorni lavorati", "$workedCount/5")
                        SummaryRow("Regola SW", currentRule.description)
                        if (currentRule is SwRule.Percentage) {
                            val theoretical = (currentRule.value / 100.0) * workedCount
                            SummaryRow("Percentuale (${currentRule.value.toInt()}%)", "${"%.1f".format(theoretical)} giorni")
                        }

                        // Result pill
                        Row(
                            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp))
                                .background(Brush.linearGradient(listOf(GreenPrimary, GreenDark))).padding(vertical = 16.dp),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("SMART WORKING", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color.White.copy(alpha = 0.6f))
                                Text("%.1f".format(targetSW), fontSize = 36.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                Text("massimo", fontSize = 10.sp, color = Color.White.copy(alpha = 0.4f))
                            }
                            Box(modifier = Modifier.width(1.dp).height(50.dp).background(Color.White.copy(alpha = 0.2f)))
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("UFFICIO", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color.White.copy(alpha = 0.6f))
                                Text("%.1f".format(targetOffice), fontSize = 36.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                Text("minimo", fontSize = 10.sp, color = Color.White.copy(alpha = 0.4f))
                            }
                        }

                        // Permutations
                        if (permutations.isNotEmpty()) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text("COMBINAZIONI", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = LightTextSecondary)
                                Text("${validPermutations.size} valide", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = GreenPrimary)
                                if (permutations.size > validPermutations.size) {
                                    TextButton(onClick = { showAll = !showAll }) {
                                        Text(if (showAll) "Solo valide" else "+${permutations.size - validPermutations.size} non valide", fontSize = 11.sp)
                                    }
                                }
                            }

                            val displayPerms = if (showAll) permutations else validPermutations
                            itemsIndexed(displayPerms) { _, perm ->
                                val origIdx = permutations.indexOf(perm)
                                val (emoji, _, adhColor) = adherenceBadge(perm.adherence)
                                val isSelected = selectedPermutation == origIdx
                                Card(
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = if (isSelected) GreenPrimary.copy(alpha = 0.08f) else Color(0xFFE5E5EA)),
                                    border = if (isSelected) androidx.compose.foundation.BorderStroke(1.5.dp, GreenPrimary) else null,
                                    modifier = Modifier.fillMaxWidth().clickable(enabled = perm.valid) { selectedPermutation = if (isSelected) null else origIdx }
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text("${origIdx + 1}", fontSize = 11.sp, color = LightTextSecondary)
                                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            perm.week.forEachIndexed { i, s -> MiniPill(s, DAY_NAMES_SHORT[i]) }
                                        }
                                        Spacer(Modifier.weight(1f))
                                        Text("🏠${perm.totalSW}", fontSize = 11.sp, color = if (perm.valid) GreenPrimary else LightTextSecondary)
                                        Text("🏢${perm.totalOffice}", fontSize = 11.sp, color = if (perm.valid) BluePrimary else LightTextSecondary)
                                        Text("$emoji ${(perm.adherence * 100).toInt()}%", fontSize = 11.sp, modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(adhColor.copy(alpha = 0.12f)).padding(horizontal = 6.dp, vertical = 2.dp))
                                        Text(if (isSelected) "✓" else if (perm.valid) "valida" else "✗", fontSize = 11.sp, color = if (isSelected) GreenPrimary else LightTextSecondary)
                                    }
                                }
                            }
                        }

                        // Actions
                        if (selectedPermutation != null && permutations[selectedPermutation!!].valid) {
                            HorizontalDivider()
                            if (!isSaving) {
                                Button(onClick = { isSaving = true }, colors = ButtonDefaults.buttonColors(containerColor = GreenPrimary), shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth()) {
                                    Text("💾 Salva questa combinazione")
                                }
                            } else {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(value = saveName, onValueChange = { saveName = it }, placeholder = { Text("Nome...") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(24.dp))
                                    Button(onClick = { /* save logic */ isSaving = false; saveMessage = "success" to "\"$saveName\" salvata!"; saveName = "" }, colors = ButtonDefaults.buttonColors(containerColor = GreenPrimary), shape = RoundedCornerShape(24.dp)) { Text("✓") }
                                    OutlinedButton(onClick = { isSaving = false; saveName = "" }, shape = RoundedCornerShape(24.dp)) { Text("✕") }
                                }
                            }
                            saveMessage?.let { (type, text) ->
                                Text(text, fontSize = 12.sp, color = if (type == "success") GreenPrimary else RedPrimary)
                            }

                            Button(
                                onClick = {
                                    val perm = permutations[selectedPermutation!!]
                                    val ts = TimesheetEngine.createTimesheetFromSW(
                                        userProfile.employeeId, userProfile.employeeName, perm.week,
                                        TimesheetEngine.getWeekNumber(), userProfile.locationCode
                                    )
                                    releaseMessage = "Timesheet ${ts.header.no} creato e inviato in approvazione!"
                                    onNavigateToTimesheet(ts)
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                                shape = RoundedCornerShape(24.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) { Text("📤 Rilascia settimana (crea Timesheet)") }
                            releaseMessage?.let { Text(it, fontSize = 12.sp, color = GreenPrimary) }
                        }
                    }
                }
            }

            // Footer
            item {
                Text("SmartWorkingDays v3 · IgelDev", fontSize = 11.sp, color = LightTextSecondary.copy(alpha = 0.5f), modifier = Modifier.padding(bottom = 24.dp))
            }
        }
    }
}

@Composable
fun SummaryRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 14.sp, color = LightTextSecondary)
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = LightTextPrimary)
    }
}

@Composable
fun LegendChip(icon: String, label: String, color: Color) {
    Row(
        modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(color.copy(alpha = 0.12f)).padding(horizontal = 8.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(icon, fontSize = 11.sp)
        Text(label, fontSize = 11.sp)
    }
}

@Composable
fun MiniPill(state: DayState, label: String) {
    val color = when (state) { DayState.SW -> GreenPrimary; DayState.OFFICE -> BluePrimary; DayState.HALF -> OrangePrimary; DayState.ABSENT -> RedPrimary; else -> Color.Gray }
    Row(
        modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(color.copy(alpha = 0.15f)).padding(horizontal = 6.dp, vertical = 3.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Text(state.icon, fontSize = 10.sp)
        Text(label, fontSize = 9.sp)
    }
}
