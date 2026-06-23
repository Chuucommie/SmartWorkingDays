package com.eosprod.smartworkingdays

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.eosprod.smartworkingdays.models.Timesheet
import com.eosprod.smartworkingdays.ui.screens.SmartWorkingScreen
import com.eosprod.smartworkingdays.ui.screens.TimesheetScreen
import com.eosprod.smartworkingdays.ui.theme.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SmartWorkingDaysApp()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SmartWorkingDaysApp() {
    var selectedTab by remember { mutableIntStateOf(0) }
    var releasedTimesheet by remember { mutableStateOf<Timesheet?>(null) }
    val releasedTimesheets = remember { mutableStateListOf<Timesheet>() }

    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = GreenPrimary,
            secondary = BluePrimary,
            background = LightBackground,
            surface = LightCard,
            onPrimary = Color.White,
            onBackground = LightTextPrimary,
            onSurface = LightTextPrimary,
        )
    ) {
        Scaffold(
            bottomBar = {
                NavigationBar {
                    NavigationBarItem(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        icon = { Text("🏠") },
                        label = { Text("Smart Working") }
                    )
                    NavigationBarItem(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        icon = { Text("⏱️") },
                        label = { Text("Timesheet") }
                    )
                }
            }
        ) { padding ->
            Box(modifier = Modifier.padding(padding)) {
                when (selectedTab) {
                    0 -> SmartWorkingScreen(
                        onNavigateToTimesheet = { ts ->
                            releasedTimesheets.add(ts)
                            selectedTab = 1
                        }
                    )
                    1 -> TimesheetScreen(initialTimesheets = releasedTimesheets.toList())
                }
            }
        }
    }
}
