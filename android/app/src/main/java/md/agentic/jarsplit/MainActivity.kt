package md.agentic.jarsplit

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import md.agentic.jarsplit.ui.JarsplitViewModel
import md.agentic.jarsplit.ui.JarsplitViewModelFactory
import md.agentic.jarsplit.ui.planform.PlanFormScreen
import md.agentic.jarsplit.ui.results.ResultsScreen
import md.agentic.jarsplit.ui.settings.SettingsScreen

private const val ROUTE_SETTINGS = "settings"
private const val ROUTE_PLAN_FORM = "plan-form"
private const val ROUTE_RESULTS = "results"

class MainActivity : ComponentActivity() {

    private val viewModel: JarsplitViewModel by viewModels {
        JarsplitViewModelFactory((application as JarsplitApp).container)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.windowInsetsPadding(WindowInsets.safeDrawing)) {
                    JarsplitNavHost(viewModel)
                }
            }
        }
    }
}

@Composable
private fun JarsplitNavHost(viewModel: JarsplitViewModel) {
    val navController: NavHostController = rememberNavController()
    val tokenSet by viewModel.tokenSet.collectAsState()

    NavHost(
        navController = navController,
        startDestination = if (tokenSet) ROUTE_PLAN_FORM else ROUTE_SETTINGS,
    ) {
        composable(ROUTE_SETTINGS) {
            SettingsScreen(
                viewModel = viewModel,
                onContinue = {
                    navController.navigate(ROUTE_PLAN_FORM) {
                        popUpTo(ROUTE_SETTINGS) { inclusive = true }
                    }
                },
            )
        }
        composable(ROUTE_PLAN_FORM) {
            PlanFormScreen(
                viewModel = viewModel,
                onOpenSettings = { navController.navigate(ROUTE_SETTINGS) },
                onGenerate = { navController.navigate(ROUTE_RESULTS) },
            )
        }
        composable(ROUTE_RESULTS) {
            ResultsScreen(
                viewModel = viewModel,
                onBack = { navController.popBackStack() },
            )
        }
    }
}
