package com.eos.smartworking

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.eos.smartworking.ui.auth.AuthScreen
import com.eos.smartworking.ui.planner.PlannerScreen
import com.eos.smartworking.ui.settings.SettingsScreen
import com.eos.smartworking.ui.team.TeamScreen
import com.eos.smartworking.ui.theme.EosSmartWorkingTheme

sealed class Screen(val route: String, val label: String, val icon: ImageVector) {
    data object Planner : Screen("planner", "Pianifica", Icons.Default.CalendarMonth)
    data object Team : Screen("team", "Team", Icons.Default.Groups)
    data object Settings : Screen("settings", "Impostazioni", Icons.Default.Settings)
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            EosSmartWorkingTheme {
                MainApp()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainApp() {
    var isLoggedIn by remember { mutableStateOf(false) }

    if (!isLoggedIn) {
        AuthScreen(onLoginSuccess = { isLoggedIn = true })
        return
    }

    val navController = rememberNavController()
    val screens = listOf(Screen.Planner, Screen.Team, Screen.Settings)

    Scaffold(
        bottomBar = {
            NavigationBar {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination

                screens.forEach { screen ->
                    NavigationBarItem(
                        icon = { Icon(screen.icon, contentDescription = screen.label) },
                        label = { Text(screen.label) },
                        selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Planner.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Planner.route) {
                PlannerScreen(onNavigateToTeam = { navController.navigate(Screen.Team.route) })
            }
            composable(Screen.Team.route) {
                TeamScreen(onNavigateToPlanner = { navController.navigate(Screen.Planner.route) })
            }
            composable(Screen.Settings.route) {
                SettingsScreen()
            }
        }
    }
}
