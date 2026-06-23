package com.eosprod.smartworkingdays.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.eosprod.smartworkingdays.engine.TimesheetEngine
import com.eosprod.smartworkingdays.models.*
import com.eosprod.smartworkingdays.ui.theme.*

enum class TimesheetTab { LIST, NEW, STATS }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimesheetScreen(
    initialTimesheets: List<Timesheet> = emptyList()
) {
    var timesheets by remember { mutableStateOf(initialTimesheets.ifEmpty {
        val weekNo = TimesheetEngine.getWeekNumber()
        val prevWeek = weekNo - 1
        val ts1 = TimesheetEngine.createTimesheetFromSW("EMP001", "Ricardo Quintero",
            listOf(DayState.SW, DayState.SW, DayState.OFFICE, DayState.OFFICE, DayState.SW), prevWeek, "BOLOGNA", "JOB-2024-001")
        ts1.header.status = TimesheetStatus.APPROVED; ts1.header.description = "Sviluppo modulo Timesheet"
        val ts2 = TimesheetEngine.createEmptyTimesheet("EMP001", "Ricardo Quintero", "BOLOGNA")
        ts2.header.description = "Documentazione e test"
        listOf(ts1, ts2)
    }) }
    var currentTab by remember { mutableStateOf(TimesheetTab.LIST) }
    var selectedTs by remember { mutableStateOf<Timesheet?>(null) }
    var editingTs by remember { mutableStateOf<Timesheet?>(null) }
    var statsTs by remember { mutableStateOf<Timesheet?>(null) }
    var filterStatus by remember { mutableStateOf<TimesheetStatus?>(null) }
    var expandedDays by remember { mutableStateOf(setOf(0, 1, 2, 3, 4)) }
    var saveMessage by remember { mutableStateOf<String?>(null) }

    val userProfile = UserProfile()
    val filtered = timesheets.filter { filterStatus == null || it.header.status == filterStatus }

    fun addTimesheet(ts: Timesheet) {
        if (timesheets.none { it.id == ts.id }) timesheets = listOf(ts) + timesheets
    }

    // Accept incoming timesheets from SW
    LaunchedEffect(initialTimesheets) {
        initialTimesheets.forEach { addTimesheet(it) }
    }

    Scaffold(containerColor = LightBackground) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Header
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(top = 24.dp)) {
                Box(modifier = Modifier.size(56.dp).clip(RoundedCornerShape(24.dp))
                    .background(Brush.linearGradient(listOf(BluePrimary, BlueDark))), contentAlignment = Alignment.Center) {
                    Text("⏱️", fontSize = 24.sp)
                }
                Text("Timesheet", fontSize = 26.sp, fontWeight = FontWeight.SemiBold, color = LightTextPrimary)
                Text(userProfile.employeeName, fontSize = 14.sp, color = LightTextSecondary)
            }

            // Tab bar
            Row(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp).clip(RoundedCornerShape(24.dp)).background(Color(0xFFE5E5EA)).padding(4.dp)) {
                listOf(TimesheetTab.LIST to "📋 Elenco", TimesheetTab.NEW to (if (editingTs != null) "✏️ Modifica" else "➕ Nuovo"), TimesheetTab.STATS to "📊 Statistiche").forEach { (tab, label) ->
                    TextButton(
                        onClick = { currentTab = tab },
                        modifier = Modifier.weight(1f).clip(RoundedCornerShape(24.dp))
                            .background(if (currentTab == tab) Color.White else Color.Transparent)
                    ) { Text(label, fontSize = 13.sp, color = if (currentTab == tab) LightTextPrimary else LightTextSecondary) }
                }
            }

            saveMessage?.let {
                Text(it, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = GreenPrimary,
                    modifier = Modifier.align(Alignment.CenterHorizontally).clip(RoundedCornerShape(16.dp))
                        .background(GreenPrimary.copy(alpha = 0.1f)).padding(horizontal = 16.dp, vertical = 8.dp))
            }

            when (currentTab) {
                TimesheetTab.LIST -> TimesheetListTab(filtered, selectedTs, filterStatus,
                    onFilterChange = { filterStatus = it },
                    onSelect = { selectedTs = if (selectedTs?.id == it.id) null else it },
                    onNew = {
                        editingTs = TimesheetEngine.createEmptyTimesheet(userProfile.employeeId, userProfile.employeeName, userProfile.locationCode)
                        expandedDays = setOf(0, 1, 2, 3, 4); currentTab = TimesheetTab.NEW
                    },
                    onEdit = { editingTs = it; expandedDays = setOf(0, 1, 2, 3, 4); currentTab = TimesheetTab.NEW },
                    onStats = { statsTs = it; currentTab = TimesheetTab.STATS },
                    onApprove = { id -> timesheets = timesheets.map { if (it.id == id) TimesheetEngine.changeStatus(it, TimesheetStatus.APPROVED) else it } },
                    onReject = { id -> timesheets = timesheets.map { if (it.id == id) TimesheetEngine.changeStatus(it, TimesheetStatus.REJECTED) else it } },
                    onDelete = { id -> timesheets = timesheets.filter { it.id != id }; if (selectedTs?.id == id) selectedTs = null }
                )
                TimesheetTab.NEW -> TimesheetEditorTab(editingTs, expandedDays,
                    onToggleDay = { expandedDays = if (it in expandedDays) expandedDays - it else expandedDays + it },
                    onAddLine = { dayIdx -> editingTs = editingTs?.let { TimesheetEngine.addEmptyLine(it, dayIdx) } },
                    onUpdateLine = { lineId, updates -> editingTs = editingTs?.let { TimesheetEngine.updateLine(it, lineId, updates) } },
                    onRemoveLine = { lineId -> editingTs = editingTs?.let { TimesheetEngine.removeLine(it, lineId) } },
                    onSaveDraft = {
                        editingTs?.let { ts ->
                            if (timesheets.any { it.id == ts.id }) timesheets = timesheets.map { if (it.id == ts.id) ts else it }
                            else timesheets = listOf(ts) + timesheets
                            editingTs = null; currentTab = TimesheetTab.LIST; saveMessage = "Bozza salvata ✓"
                        }
                    },
                    onSubmit = {
                        editingTs?.let { ts ->
                            val (valid, errors, _) = TimesheetEngine.validateTimesheet(ts)
                            if (!valid) { saveMessage = errors.first(); return@let }
                            val updated = TimesheetEngine.changeStatus(ts, TimesheetStatus.PENDING_APPROVAL)
                            if (timesheets.any { it.id == ts.id }) timesheets = timesheets.map { if (it.id == ts.id) updated else it }
                            else timesheets = listOf(updated) + timesheets
                            editingTs = null; currentTab = TimesheetTab.LIST; saveMessage = "Timesheet inviato in approvazione ✓"
                        }
                    },
                    onCancel = { editingTs = null; currentTab = TimesheetTab.LIST }
                )
                TimesheetTab.STATS -> TimesheetStatsTab(statsTs, onBack = { currentTab = TimesheetTab.LIST })
            }
        }
    }
}

@Composable
fun TimesheetListTab(
    timesheets: List<Timesheet>,
    selectedTs: Timesheet?,
    filterStatus: TimesheetStatus?,
    onFilterChange: (TimesheetStatus?) -> Unit,
    onSelect: (Timesheet) -> Unit,
    onNew: () -> Unit,
    onEdit: (Timesheet) -> Unit,
    onStats: (Timesheet) -> Unit,
    onApprove: (String) -> Unit,
    onReject: (String) -> Unit,
    onDelete: (String) -> Unit
) {
    LazyColumn(modifier = Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                var expanded by remember { mutableStateOf(false) }
                Box {
                    OutlinedButton(onClick = { expanded = true }, shape = RoundedCornerShape(24.dp)) {
                        Text(filterStatus?.label ?: "Tutti gli stati", fontSize = 12.sp)
                    }
                    DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        DropdownMenuItem(text = { Text("Tutti gli stati") }, onClick = { onFilterChange(null); expanded = false })
                        TimesheetStatus.entries.forEach { s ->
                            DropdownMenuItem(text = { Text(s.label) }, onClick = { onFilterChange(s); expanded = false })
                        }
                    }
                }
                Button(onClick = onNew, colors = ButtonDefaults.buttonColors(containerColor = BluePrimary), shape = RoundedCornerShape(24.dp)) {
                    Text("+ Nuovo Timesheet", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        if (timesheets.isEmpty()) {
            item { Box(Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) { Text("📭\nNessun timesheet trovato", fontSize = 14.sp, color = LightTextSecondary) } }
        } else {
            items(timesheets) { ts ->
                val stats = TimesheetEngine.computeStats(ts)
                val isExpanded = selectedTs?.id == ts.id
                val statusColor = Color(android.graphics.Color.parseColor(ts.header.status.colorHex))
                Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = LightCard), modifier = Modifier.fillMaxWidth().clickable { onSelect(ts) }) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column { Text(ts.header.no, fontSize = 14.sp, fontWeight = FontWeight.SemiBold); Text(ts.header.description, fontSize = 12.sp, color = LightTextSecondary) }
                            Text(ts.header.status.label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = statusColor, modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(statusColor.copy(alpha = 0.12f)).padding(horizontal = 8.dp, vertical = 4.dp))
                        }
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("📅 Sett. ${ts.header.weekNo}", fontSize = 12.sp, color = LightTextSecondary)
                            Text("${TimesheetEngine.formatDateShort(ts.header.startingDate)} — ${TimesheetEngine.formatDateShort(ts.header.endingDate)}", fontSize = 12.sp, color = LightTextSecondary)
                            Text("⏱️ ${"%.1f".format(stats.totalHours)}h", fontSize = 12.sp, color = LightTextSecondary)
                        }
                        if (isExpanded) {
                            HorizontalDivider(Modifier.padding(vertical = 8.dp))
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                TextButton(onClick = onEdit) { Text("✏️ Modifica", fontSize = 12.sp) }
                                TextButton(onClick = onStats) { Text("📊 Statistiche", fontSize = 12.sp) }
                                if (ts.header.status == TimesheetStatus.PENDING_APPROVAL) {
                                    Button(onClick = { onApprove(ts.id) }, colors = ButtonDefaults.buttonColors(containerColor = GreenPrimary), shape = RoundedCornerShape(24.dp)) { Text("✓ Approva", fontSize = 12.sp) }
                                    Button(onClick = { onReject(ts.id) }, colors = ButtonDefaults.buttonColors(containerColor = RedPrimary), shape = RoundedCornerShape(24.dp)) { Text("✕ Respingi", fontSize = 12.sp) }
                                }
                                Spacer(Modifier.weight(1f))
                                TextButton(onClick = { onDelete(ts.id) }) { Text("🗑 Elimina", fontSize = 12.sp, color = RedPrimary) }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TimesheetEditorTab(
    editingTs: Timesheet?,
    expandedDays: Set<Int>,
    onToggleDay: (Int) -> Unit,
    onAddLine: (Int) -> Unit,
    onUpdateLine: (String, (TimesheetLine) -> Unit) -> Unit,
    onRemoveLine: (String) -> Unit,
    onSaveDraft: () -> Unit,
    onSubmit: () -> Unit,
    onCancel: () -> Unit
) {
    if (editingTs == null) return
    val days = TimesheetEngine.groupByDay(editingTs.lines, editingTs.header.weekNo)
    val totalH = TimesheetEngine.computeTotalHours(editingTs.lines)

    LazyColumn(modifier = Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // Header card
        item {
            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = LightCard)) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("GENERALE", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = LightTextSecondary)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        ReadonlyField(FieldLabels.RESOURCE_NO, editingTs.header.resourceNo, Modifier.weight(1f))
                        ReadonlyField(FieldLabels.RESOURCE_NAME, editingTs.header.resourceName, Modifier.weight(1f))
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        ReadonlyField(FieldLabels.STATUS, editingTs.header.status.label, Modifier.weight(1f), Color(android.graphics.Color.parseColor(editingTs.header.status.colorHex)))
                        ReadonlyField(FieldLabels.WEEK_NO, "${editingTs.header.weekNo}", Modifier.weight(1f))
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        ReadonlyField(FieldLabels.STARTING_DATE, TimesheetEngine.formatDate(editingTs.header.startingDate), Modifier.weight(1f))
                        ReadonlyField(FieldLabels.ENDING_DATE, TimesheetEngine.formatDate(editingTs.header.endingDate), Modifier.weight(1f))
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        ReadonlyField(FieldLabels.PERIOD_TYPE, editingTs.header.periodType, Modifier.weight(1f))
                        EditableField(FieldLabels.JOB_NO, editingTs.header.jobNo, Modifier.weight(1f)) { editingTs.header.jobNo = it }
                    }
                    EditableField(FieldLabels.DESCRIPTION, editingTs.header.description, Modifier.fillMaxWidth()) { editingTs.header.description = it }
                }
            }
        }

        // Lines card
        item {
            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = LightCard)) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("RIGHE", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = LightTextSecondary)
                        Text("Totale: ${"%.1f".format(totalH)}h", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = LightTextPrimary)
                    }
                    days.forEach { day ->
                        val isExpanded = day.dayIndex in expandedDays
                        Column {
                            Row(
                                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                                    .background(if (day.totalHours > 0) BluePrimary.copy(alpha = 0.06f) else Color(0xFFE5E5EA))
                                    .clickable { onToggleDay(day.dayIndex) }.padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text(if (isExpanded) "▼" else "▶", fontSize = 14.sp)
                                    Text("${day.dayName} ${TimesheetEngine.formatDateShort(day.date)}", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                                    if (day.totalHours > 0) Text("${"%.1f".format(day.totalHours)}h", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BluePrimary, modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(BluePrimary.copy(alpha = 0.12f)).padding(horizontal = 8.dp, vertical = 2.dp))
                                }
                                TextButton(onClick = { onAddLine(day.dayIndex) }) { Text("+ Aggiungi riga", fontSize = 11.sp) }
                            }
                            if (isExpanded) {
                                if (day.lines.isEmpty()) {
                                    Text("Nessuna riga per questo giorno", fontSize = 12.sp, color = LightTextSecondary, modifier = Modifier.padding(vertical = 8.dp))
                                } else {
                                    day.lines.forEach { line ->
                                        LineEditorCard(line, onUpdateLine, onRemoveLine)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Actions
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = onSaveDraft, modifier = Modifier.weight(1f), shape = RoundedCornerShape(24.dp)) { Text("💾 Salva bozza") }
                Button(onClick = onSubmit, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = BluePrimary), shape = RoundedCornerShape(24.dp)) { Text("📤 Invia in approvazione") }
            }
            TextButton(onClick = onCancel, modifier = Modifier.fillMaxWidth()) { Text("← Annulla", color = LightTextSecondary) }
        }
    }
}

@Composable
fun LineEditorCard(line: TimesheetLine, onUpdateLine: (String, (TimesheetLine) -> Unit) -> Unit, onRemoveLine: (String) -> Unit) {
    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = Color(0xFFE5E5EA)), modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Riga ${line.lineNo}", fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = LightTextSecondary)
                TextButton(onClick = { onRemoveLine(line.id) }) { Text("✕", fontSize = 12.sp, color = RedPrimary) }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                EditableField(FieldLabels.TYPE, line.type.label, Modifier.weight(1f)) { /* type picker */ }
                EditableField(FieldLabels.NO, line.no, Modifier.weight(1f)) { onUpdateLine(line.id) { it.no = line.no } }
            }
            EditableField(FieldLabels.DESCRIPTION, line.description, Modifier.fillMaxWidth()) { onUpdateLine(line.id) { it.description = line.description } }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                EditableField(FieldLabels.QUANTITY, "${line.quantity}", Modifier.weight(1f)) { onUpdateLine(line.id) { it.quantity = line.quantity } }
                EditableField(FieldLabels.UNIT_OF_MEASURE, line.unitOfMeasure.label, Modifier.weight(1f)) { /* uom picker */ }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                EditableField(FieldLabels.JOB_NO, line.jobNo, Modifier.weight(1f)) { onUpdateLine(line.id) { it.jobNo = line.jobNo } }
                EditableField(FieldLabels.WORK_TYPE, line.workType, Modifier.weight(1f)) { onUpdateLine(line.id) { it.workType = line.workType } }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                EditableField(FieldLabels.CHARGEABLE, if (line.chargeable) "Sì" else "No", Modifier.weight(1f)) { onUpdateLine(line.id) { it.chargeable = !it.chargeable } }
                EditableField(FieldLabels.LOCATION_CODE, line.locationCode, Modifier.weight(1f)) { onUpdateLine(line.id) { it.locationCode = line.locationCode } }
            }
        }
    }
}

@Composable
fun TimesheetStatsTab(statsTs: Timesheet?, onBack: () -> Unit) {
    if (statsTs == null) {
        Box(Modifier.fillMaxSize().padding(48.dp), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("📊", fontSize = 40.sp)
                Text("Seleziona un timesheet dall'elenco", fontSize = 14.sp, color = LightTextSecondary)
                TextButton(onClick = onBack) { Text("Vai all'elenco") }
            }
        }
        return
    }

    val stats = TimesheetEngine.computeStats(statsTs)
    val days = TimesheetEngine.groupByDay(statsTs.lines, statsTs.header.weekNo)

    LazyColumn(modifier = Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = LightCard)) {
                Column(Modifier.padding(20.dp).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${statsTs.header.no} — ${statsTs.header.description}", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text("${"%.1f".format(stats.totalHours)}h", fontSize = 36.sp, fontWeight = FontWeight.Bold, color = BluePrimary)
                    Text("Ore totali — Sett. ${statsTs.header.weekNo}", fontSize = 12.sp, color = LightTextSecondary)
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = LightCard)) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("ORE PER GIORNO", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = LightTextSecondary)
                    val maxH = days.maxOfOrNull { it.totalHours } ?: 1.0
                    days.forEach { day ->
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("${DAY_NAMES_SHORT[day.dayIndex]} ${TimesheetEngine.formatDateShort(day.date)}", fontSize = 12.sp, modifier = Modifier.width(80.dp))
                            Box(Modifier.weight(1f).height(20.dp).clip(RoundedCornerShape(4.dp)).background(Color(0xFFE5E5EA))) {
                                Box(Modifier.fillMaxHeight().fillMaxWidth(fraction = (day.totalHours / maxOf(maxH, 1.0)).toFloat().coerceIn(0.02f, 1f)).clip(RoundedCornerShape(4.dp)).background(if (day.totalHours > 8) OrangePrimary else BluePrimary))
                            }
                            Text("${"%.1f".format(day.totalHours)}h", fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.width(40.dp))
                        }
                    }
                }
            }
        }

        if (stats.byWorkType.isNotEmpty()) {
            item {
                Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = LightCard)) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("PER TIPO LAVORO", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = LightTextSecondary)
                        stats.byWorkType.forEach { (wt, hours) ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(wt, fontSize = 14.sp); Text("${"%.1f".format(hours)}h", fontSize = 14.sp, color = LightTextSecondary)
                            }
                        }
                    }
                }
            }
        }

        if (stats.byJob.isNotEmpty()) {
            item {
                Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = LightCard)) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("PER COMMESSA", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = LightTextSecondary)
                        stats.byJob.forEach { (job, hours) ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(job, fontSize = 14.sp); Text("${"%.1f".format(hours)}h", fontSize = 14.sp, color = LightTextSecondary)
                            }
                        }
                    }
                }
            }
        }

        item { TextButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("← Torna all'elenco") } }
    }
}

@Composable
fun ReadonlyField(label: String, value: String, modifier: Modifier = Modifier, color: Color = LightTextPrimary) {
    Column(modifier = modifier) {
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.Medium, color = LightTextSecondary)
        Text(value, fontSize = 13.sp, color = color, modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(Color(0xFFE5E5EA)).padding(10.dp))
    }
}

@Composable
fun EditableField(label: String, value: String, modifier: Modifier = Modifier, onChange: (String) -> Unit) {
    var text by remember(value) { mutableStateOf(value) }
    Column(modifier = modifier) {
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.Medium, color = LightTextSecondary)
        OutlinedTextField(value = text, onValueChange = { text = it; onChange(it) }, modifier = Modifier.fillMaxWidth(), textStyle = LocalTextStyle.current.copy(fontSize = 13.sp), shape = RoundedCornerShape(8.dp), singleLine = true)
    }
}
