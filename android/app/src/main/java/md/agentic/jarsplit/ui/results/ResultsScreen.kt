package md.agentic.jarsplit.ui.results

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import md.agentic.jarsplit.domain.jarmatching.MatchWarning
import md.agentic.jarsplit.domain.linkgen.Link
import md.agentic.jarsplit.domain.planvalidation.PlanValidationWarning
import md.agentic.jarsplit.domain.run.FatalReason
import md.agentic.jarsplit.domain.run.RunOutcome
import md.agentic.jarsplit.domain.run.RunResult
import md.agentic.jarsplit.domain.run.UiWarning
import md.agentic.jarsplit.ui.JarsplitViewModel

/**
 * FR-ANDROID-RESULT-01: Complete/Partial/Fatal, the UI analog of the CLI's
 * exit codes 0/1/2. Links open via ACTION_VIEW (FR-ANDROID-LINK-01) — never
 * an in-app WebView, so the real V-1 gate (prefilled amount is UAH, not
 * kopiykas) can be verified against the real external page/app.
 */
@Composable
fun ResultsScreen(viewModel: JarsplitViewModel, onBack: () -> Unit) {
    val outcome by viewModel.runOutcome.collectAsState()
    val context = LocalContext.current

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(text = "Results", style = MaterialTheme.typography.titleLarge)
            TextButton(onClick = onBack) { Text("Back") }
        }

        when (outcome) {
            null -> Text(text = "No result yet.")
            is RunOutcome.Complete -> ResultBody(
                banner = "Complete",
                result = (outcome as RunOutcome.Complete).result,
                onOpenLink = { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) },
            )
            is RunOutcome.Partial -> ResultBody(
                banner = "Partial",
                result = (outcome as RunOutcome.Partial).result,
                onOpenLink = { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) },
            )
            is RunOutcome.Fatal -> FatalBody((outcome as RunOutcome.Fatal).reason)
        }
    }
}

@Composable
private fun ResultBody(banner: String, result: RunResult, onOpenLink: (String) -> Unit) {
    Text(text = banner, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 8.dp))

    LazyColumn(modifier = Modifier.padding(top = 8.dp)) {
        items(items = result.links, key = { it.url }) { link -> LinkRow(link, onOpenLink) }
        item {
            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            Text(text = "Разом: ${result.total} ₴")
        }
        if (result.warnings.isNotEmpty()) {
            item { Text(text = "Warnings", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 16.dp)) }
            items(items = result.warnings) { warning -> Text(text = "• ${describeWarning(warning)}") }
            item {
                Text(
                    text = "Skipped: ${result.skippedTotal} ₴ across ${result.skippedCount} jar(s)",
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
    }
}

@Composable
private fun LinkRow(link: Link, onOpenLink: (String) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(text = "${link.name} — ${link.amount} ₴")
        Button(onClick = { onOpenLink(link.url) }) { Text("Open") }
    }
}

@Composable
private fun FatalBody(reason: FatalReason) {
    Text(text = "Fatal", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 8.dp))
    Text(text = describeFatal(reason), modifier = Modifier.padding(top = 8.dp))
    if (reason is FatalReason.NothingMatched && reason.warnings.isNotEmpty()) {
        Column(modifier = Modifier.padding(top = 16.dp)) {
            Text(text = "Warnings", style = MaterialTheme.typography.titleSmall)
            reason.warnings.forEach { warning -> Text(text = "• ${describeWarning(warning)}") }
        }
    }
}

private fun describeFatal(reason: FatalReason): String = when (reason) {
    FatalReason.MissingToken -> "No token is set. Add one on the Settings screen."
    FatalReason.InvalidToken -> "monobank rejected the token (401). Check the token on Settings."
    FatalReason.RateLimited -> "Rate-limited by monobank (429). Retry in about a minute."
    is FatalReason.Unreachable -> "Could not reach monobank: ${reason.detail}"
    FatalReason.NoValidEntries -> "No valid plan rows. Fix the rows and try again."
    is FatalReason.NothingMatched -> "None of the plan rows matched a jar."
}

private fun describeWarning(warning: UiWarning): String = when (warning) {
    is UiWarning.Validation -> when (val w = warning.warning) {
        is PlanValidationWarning.EmptyName -> "A row has an empty name."
        is PlanValidationWarning.InvalidAmount -> "\"${w.name}\": invalid amount \"${w.rawAmount}\"."
        is PlanValidationWarning.DuplicateName -> "\"${w.name}\": duplicate name across rows."
    }
    is UiWarning.Matching -> when (val w = warning.warning) {
        is MatchWarning.Unknown -> "\"${w.name}\" (${w.amount} ₴): unknown jar. Available: ${w.availableNames.joinToString()}"
        is MatchWarning.NonUAH -> "\"${w.name}\" (${w.amount} ₴): matched jar is not UAH."
        is MatchWarning.Ambiguous -> "\"${w.name}\" (${w.amount} ₴): matches more than one jar."
    }
}
