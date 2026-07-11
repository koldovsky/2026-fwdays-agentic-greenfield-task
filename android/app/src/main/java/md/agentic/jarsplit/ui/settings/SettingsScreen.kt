package md.agentic.jarsplit.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import md.agentic.jarsplit.ui.JarsplitViewModel

/**
 * FR-ANDROID-TOKEN-01: masked token entry, status-only display once saved.
 * The "use sample data" toggle is always available (not BuildConfig.DEBUG
 * -gated, resolved at the change's human gate — see design.md).
 */
@Composable
fun SettingsScreen(viewModel: JarsplitViewModel, onContinue: () -> Unit) {
    val tokenSet by viewModel.tokenSet.collectAsState()
    val useSampleData by viewModel.useSampleData.collectAsState()
    var tokenInput by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        Text(text = "monobank token")
        Text(text = if (tokenSet) "Status: token set" else "Status: not set")

        OutlinedTextField(
            value = tokenInput,
            onValueChange = { tokenInput = it },
            label = { Text("Personal token") },
            visualTransformation = PasswordVisualTransformation(),
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        )

        Row(modifier = Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = {
                    if (tokenInput.isNotBlank()) {
                        viewModel.setToken(tokenInput)
                        tokenInput = ""
                    }
                },
            ) { Text("Save") }

            OutlinedButton(
                onClick = {
                    viewModel.clearToken()
                    tokenInput = ""
                },
            ) { Text("Clear") }
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(text = "Use sample data (no live API call)")
            Switch(
                checked = useSampleData,
                onCheckedChange = { viewModel.setUseSampleData(it) },
            )
        }

        Button(onClick = onContinue, modifier = Modifier.fillMaxWidth().padding(top = 24.dp)) {
            Text("Continue")
        }
    }
}
