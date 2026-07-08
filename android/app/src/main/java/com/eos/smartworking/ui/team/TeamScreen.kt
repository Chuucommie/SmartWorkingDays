package com.eos.smartworking.ui.team

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.eos.smartworking.model.DayState
import com.eos.smartworking.model.TeamMember
import com.eos.smartworking.util.DateUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeamScreen(
    onNavigateToPlanner: () -> Unit,
    viewModel: TeamViewModel = viewModel()
) {
    val state by viewModel.state.collectAsState()
    val overlaps = viewModel.computeOfficeOverlaps()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("👥 Team Smart Working") },
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
            // Controlli
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Navigazione settimana
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { viewModel.changeWeek(-1) }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.ChevronLeft, "Prec")
                    }
                    Text(
                        DateUtils.formatWeekRange(state.weekStart),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    IconButton(onClick = { viewModel.changeWeek(1) }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.ChevronRight, "Succ")
                    }
                    IconButton(onClick = { viewModel.goToCurrentWeek() }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.Today, "Oggi")
                    }
                }

                // Filtro sede
                var filterExpanded by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(expanded = filterExpanded, onExpandedChange = { filterExpanded = it }) {
                    OutlinedTextField(
                        value = when (state.locationFilter) {
                            "" -> "La mia sede"
                            "ALL" -> "Tutte le sedi"
                            else -> state.locationFilter.lowercase().replaceFirstChar { it.uppercase() }
                        },
                        onValueChange = {},
                        readOnly = true,
                        modifier = Modifier.width(150.dp).menuAnchor(),
                        shape = RoundedCornerShape(24.dp),
                        textStyle = MaterialTheme.typography.bodySmall,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = filterExpanded) }
                    )
                    ExposedDropdownMenu(expanded = filterExpanded, onDismissRequest = { filterExpanded = false }) {
                        DropdownMenuItem(text = { Text("La mia sede") }, onClick = { viewModel.setLocationFilter(""); filterExpanded = false })
                        DropdownMenuItem(text = { Text("🏢 Tutte le sedi") }, onClick = { viewModel.setLocationFilter("ALL"); filterExpanded = false })
                        HorizontalDivider()
                        viewModel.locations.forEach { loc ->
                            DropdownMenuItem(
                                text = { Text("📍 ${loc.lowercase().replaceFirstChar { it.uppercase() }}") },
                                onClick = { viewModel.setLocationFilter(loc); filterExpanded = false }
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Loading
            if (state.loading) {
                Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }

            // Error
            state.error?.let {
                Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                    Text("⚠️ $it", modifier = Modifier.padding(16.dp))
                    TextButton(onClick = { viewModel.loadTeamData() }) { Text("Riprova") }
                }
            }

            // Card utente corrente
            if (!state.loading) {
                state.myPlan?.let { plan ->
                    MemberCard(
                        member = plan,
                        isSelf = true,
                        overlaps = overlaps,
                        onDelete = { viewModel.deleteMyPlan() },
                        deleting = state.deleting,
                        deleteMsg = state.deleteMsg,
                        deleteSuccess = state.deleteSuccess
                    )
                } ?: run {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Tu", fontWeight = FontWeight.Bold)
                            Text("Non hai ancora pianificato questa settimana", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            TextButton(onClick = onNavigateToPlanner) { Text("Pianifica ora →") }
                        }
                    }
                }

                Spacer(Modifier.height(12.dp))

                // Colleghi
                if (state.colleagues.isEmpty() && state.myPlan != null) {
                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("😶", fontSize = 32.sp)
                            Text("Nessun collega ha ancora pianificato", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }

                state.colleagues.forEach { colleague ->
                    MemberCard(member = colleague, isSelf = false, overlaps = emptyMap())
                    Spacer(Modifier.height(8.dp))
                }

                // Sezione coincidenze
                if (state.myPlan != null) {
                    Spacer(Modifier.height(16.dp))
                    OfficeOverlapSection(myPlan = state.myPlan, colleagues = state.colleagues)
                }
            }

            Spacer(Modifier.height(16.dp))
            TextButton(onClick = onNavigateToPlanner) { Text("📅 Pianifica") }
        }
    }
}

@Composable
fun MemberCard(
    member: TeamMember,
    isSelf: Boolean,
    overlaps: Map<Int, List<String>>,
    onDelete: (() -> Unit)? = null,
    deleting: Boolean = false,
    deleteMsg: String? = null,
    deleteSuccess: Boolean = false
) {
    val swCount = member.week.count { it == DayState.SW }
    val officeCount = member.week.count { it == DayState.OFFICE }
    val dayLabels = listOf("Lun", "Mar", "Mer", "Gio", "Ven")

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        border = if (isSelf) BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else null
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        "${if (isSelf) "👤 " else ""}${member.employeeName}",
                        fontWeight = FontWeight.Bold
                    )
                    Text("📍 ${member.locationCode}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                        Text("🏠 $swCount", modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), fontSize = 12.sp)
                    }
                    Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.secondaryContainer) {
                        Text("🏢 $officeCount", modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), fontSize = 12.sp)
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // Griglia giorni
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                member.week.forEachIndexed { i, state ->
                    val icon = when (state) {
                        DayState.SW -> "🏠"
                        DayState.OFFICE -> "🏢"
                        DayState.ABSENT -> "✕"
                        else -> "—"
                    }
                    val bgColor = when (state) {
                        DayState.SW -> MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                        DayState.OFFICE -> MaterialTheme.colorScheme.secondary.copy(alpha = 0.1f)
                        DayState.ABSENT -> MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
                        else -> Color.Transparent
                    }
                    val hasOverlap = isSelf && overlaps.containsKey(i)
                    val overlapCount = overlaps[i]?.size ?: 0

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(bgColor)
                            .padding(8.dp)
                    ) {
                        Text(dayLabels[i], fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(icon, fontSize = 18.sp)
                        if (hasOverlap) {
                            Text("👥$overlapCount", fontSize = 10.sp, color = MaterialTheme.colorScheme.secondary)
                        }
                    }
                }
            }

            // Delete button (solo self)
            if (isSelf && onDelete != null) {
                Spacer(Modifier.height(8.dp))
                deleteMsg?.let {
                    Text(it, color = if (deleteSuccess) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error, fontSize = 12.sp)
                }
                OutlinedButton(
                    onClick = onDelete,
                    enabled = !deleting,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                ) {
                    Text(if (deleting) "⏳..." else "🗑️ Cancella pianificazione")
                }
            }
        }
    }
}

@Composable
fun OfficeOverlapSection(myPlan: TeamMember, colleagues: List<TeamMember>) {
    val dayLabels = listOf("Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì")
    val officeDays = myPlan.week.mapIndexedNotNull { i, s -> if (s == DayState.OFFICE) i else null }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(2.dp, MaterialTheme.colorScheme.secondary)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("🏢 Chi è in ufficio con te", fontWeight = FontWeight.Bold, fontSize = 16.sp)

            if (officeDays.isEmpty()) {
                Text("Non hai giorni in ufficio questa settimana.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                officeDays.forEach { dayIdx ->
                    val inOffice = colleagues.filter { it.week.getOrNull(dayIdx) == DayState.OFFICE }
                    Spacer(Modifier.height(8.dp))
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (inOffice.isNotEmpty()) MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surfaceVariant
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.width(48.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(dayLabels[dayIdx].take(3).uppercase(), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("🏢", fontSize = 20.sp)
                            }
                            if (inOffice.isNotEmpty()) {
                                Column {
                                    Text("👥 ${inOffice.size} ${if (inOffice.size == 1) "collega" else "colleghi"} in ufficio", fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.secondary)
                                    Text(inOffice.joinToString(", ") { it.employeeName }, fontSize = 12.sp)
                                }
                            } else {
                                Text("🏠 Solo tu in ufficio", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
    }
}
