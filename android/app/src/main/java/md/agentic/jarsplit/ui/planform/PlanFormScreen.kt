package md.agentic.jarsplit.ui.planform

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import md.agentic.jarsplit.domain.planvalidation.PlanRow
import md.agentic.jarsplit.domain.planvalidation.PlanValidationWarning
import md.agentic.jarsplit.ui.JarsplitViewModel

/**
 * FR-ANDROID-INPUT-01/02: form rows instead of a plan file, inline
 * validation. Autocomplete (FR-ANDROID-CACHE-01) only ever suggests — the
 * fresh fetch-and-match on Generate is what actually decides a match.
 */
@Composable
fun PlanFormScreen(viewModel: JarsplitViewModel, onOpenSettings: () -> Unit, onGenerate: () -> Unit) {
    val rows by viewModel.planRows.collectAsState()
    val warnings by viewModel.rowWarnings.collectAsState()
    val suggestions by viewModel.jarSuggestions.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { viewModel.refreshJarSuggestions() }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(text = "Plan", style = MaterialTheme.typography.titleLarge)
            TextButton(onClick = onOpenSettings) { Text("Settings") }
        }

        LazyColumn(modifier = Modifier.weight(1f).padding(top = 8.dp)) {
            items(items = rows, key = { it.id }) { row ->
                PlanRowEditor(
                    row = row,
                    suggestions = suggestions,
                    nameError = errorMessage(row.id, warnings, isNameError = true),
                    amountError = errorMessage(row.id, warnings, isNameError = false),
                    onNameChange = { viewModel.updateRow(row.id, name = it) },
                    onAmountChange = { viewModel.updateRow(row.id, amountText = it) },
                    onRemove = { viewModel.removeRow(row.id) },
                )
            }
        }

        TextButton(onClick = { viewModel.addRow() }) { Text("+ Add jar") }

        Button(
            onClick = {
                scope.launch {
                    viewModel.generate()
                    onGenerate()
                }
            },
            enabled = !isLoading,
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        ) {
            Text(if (isLoading) "Generating…" else "Generate links")
        }
    }
}

private fun errorMessage(rowId: Long, warnings: List<PlanValidationWarning>, isNameError: Boolean): String? {
    for (warning in warnings) {
        when (warning) {
            is PlanValidationWarning.EmptyName -> if (isNameError && warning.rowId == rowId) return "Name is required"
            is PlanValidationWarning.DuplicateName -> if (isNameError && rowId in warning.rowIds) return "Duplicate jar name"
            is PlanValidationWarning.InvalidAmount -> if (!isNameError && warning.rowId == rowId) return "Invalid amount"
        }
    }
    return null
}

@Composable
private fun PlanRowEditor(
    row: PlanRow,
    suggestions: List<String>,
    nameError: String?,
    amountError: String?,
    onNameChange: (String) -> Unit,
    onAmountChange: (String) -> Unit,
    onRemove: () -> Unit,
) {
    val filteredSuggestions = remember(row.name, suggestions) {
        if (row.name.isBlank()) emptyList() else suggestions.filter { it.contains(row.name, ignoreCase = true) }.take(3)
    }

    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = row.name,
                onValueChange = onNameChange,
                label = { Text("Jar name") },
                isError = nameError != null,
                supportingText = nameError?.let { { Text(it) } },
                singleLine = true,
                modifier = Modifier.weight(1.4f),
            )
            OutlinedTextField(
                value = row.amountText,
                onValueChange = onAmountChange,
                label = { Text("Amount") },
                isError = amountError != null,
                supportingText = amountError?.let { { Text(it) } },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
            )
        }
        if (filteredSuggestions.isNotEmpty()) {
            Row(modifier = Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                filteredSuggestions.forEach { suggestion ->
                    TextButton(onClick = { onNameChange(suggestion) }) { Text(suggestion) }
                }
            }
        }
        TextButton(onClick = onRemove) { Text("Remove") }
    }
}
