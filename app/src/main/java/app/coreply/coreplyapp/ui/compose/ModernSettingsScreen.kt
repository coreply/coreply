package app.coreply.coreplyapp.ui.compose

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import app.coreply.coreplyapp.WelcomeActivity
import app.coreply.coreplyapp.ui.viewmodel.SettingsViewModel
import app.coreply.coreplyapp.utils.GlobalPref
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import app.coreply.coreplyapp.AppSelectorActivity

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ModernSettingsScreen(
    viewModel: SettingsViewModel = viewModel()
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.updateMasterSwitchState(context)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    val uiState = viewModel.uiState

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
    ) {
        // Master Switch Section
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "Coreply Service",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Enable Coreply",
                        style = MaterialTheme.typography.bodyLarge
                    )
                    Text(
                        text = "Toggle the main Coreply accessibility service",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Switch(
                    checked = uiState.masterSwitchEnabled,
                    onCheckedChange = { enabled ->
                        val intent = Intent(context, WelcomeActivity::class.java)
                        if (enabled) {
                            intent.putExtra(
                                "page",
                                GlobalPref.getFirstRunActivityPageNumber(context)
                            )
                        } else {
                            intent.putExtra(
                                "page",
                                3
                            ) // page=3 means disable accessibility page
                        }
                        context.startActivity(intent)
                    }
                )
            }

            // Select Apps Button
            Spacer(modifier = Modifier.height(16.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    val intent = Intent(context, AppSelectorActivity::class.java)
                    context.startActivity(intent)
                }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Select Apps",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium
                        )
                        val selectedCount = uiState.selectedApps.size
                        Text(
                            text = if (selectedCount > 0) "$selectedCount apps selected" else "Choose apps for universal mode",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Icon(
                        Icons.Default.ArrowForward,
                        contentDescription = "Open app selector",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
        CustomApiSettingsSection(viewModel)
    }
}

@Composable
fun CustomApiSettingsSection(viewModel: SettingsViewModel) {
    val uiState = viewModel.uiState
    var showApiKey by remember { mutableStateOf(false) }


    Column(
        modifier = Modifier.padding(16.dp)
    ) {
        Text(
            text = "Custom API Settings",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        // API URL
        OutlinedTextField(

            value = uiState.customApiUrl,
            onValueChange = viewModel::updateCustomApiUrl,
            label = { Text("API URL") },
            supportingText = { Text("OpenAI compatible API endpoint") },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp)

        )

        // API Key
        OutlinedTextField(
            value = uiState.customApiKey, onValueChange = viewModel::updateCustomApiKey,
            label = { Text("API Key") },
            supportingText = { Text("Your API authentication key") },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp),
            trailingIcon = {
                IconButton(onClick = {
                    showApiKey = !showApiKey
                }) {
                    Icon(
                        imageVector = if (showApiKey) Icons.Default.Lock else Icons.Default.Info,
                        contentDescription = if (showApiKey) "Hide API Key" else "Show API Key"
                    )
                }
            },
            visualTransformation = if (showApiKey) VisualTransformation.None else PasswordVisualTransformation()
        )

        // Model Name
        OutlinedTextField(
            value = uiState.customModelName,
            onValueChange = viewModel::updateCustomModelName,
            label = { Text("Model Name") },
            supportingText = { Text("Model name of the LLM") },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp)
        )

        // System Prompt
        OutlinedTextField(
            value = uiState.customSystemPrompt,
            onValueChange = viewModel::updateCustomSystemPrompt,
            label = { Text("System Prompt") },
            supportingText = { Text("Instructions for the AI assistant") },
            minLines = 3,
            maxLines = 6,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
        )

        // Temperature Slider
        Column(modifier = Modifier.padding(bottom = 12.dp)) {
            Text(
                text = "Temperature: ${String.format("%.1f", uiState.temperature)}",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            Slider(
                value = uiState.temperature,
                onValueChange = viewModel::updateTemperature,
                valueRange = 0f..1f,
                steps = 9,

                )
            Text(
                text = "Controls randomness in responses",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        // Top-P Slider
        Column {
            Text(
                text = "Top-P: ${String.format("%.1f", uiState.topP)}",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            Slider(
                value = uiState.topP,
                onValueChange = viewModel::updateTopP,
                valueRange = 0f..1f,
                steps = 9
            )
            Text(
                text = "Controls diversity of token selection",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
