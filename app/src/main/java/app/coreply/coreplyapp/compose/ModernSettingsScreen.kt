package app.coreply.coreplyapp.compose

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import app.coreply.coreplyapp.WelcomeActivity
import app.coreply.coreplyapp.compose.viewmodel.SettingsViewModel
import app.coreply.coreplyapp.utils.GlobalPref
import androidx.compose.runtime.DisposableEffect
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner

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
        }


        // API Type Selection

        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "API Configuration",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Tab-like selection for API type
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    onClick = { viewModel.updateApiType("custom") },
                    label = { Text("Custom API") },
                    selected = uiState.apiType == "custom",
                    trailingIcon = if (uiState.apiType == "custom") {
                        { Icon(Icons.Default.Check, contentDescription = "Selected") }
                    } else null,
                    modifier = Modifier.weight(1f)
                )

                FilterChip(
                    onClick = { viewModel.updateApiType("hosted") },
                    label = { Text("Coreply Hosted") },
                    selected = uiState.apiType == "hosted",
                    trailingIcon = if (uiState.apiType == "hosted") {
                        { Icon(Icons.Default.Check, contentDescription = "Selected") }
                    } else null,
                    modifier = Modifier.weight(1f)
                )
            }
        }


        // Content based on API type selection
        when (uiState.apiType) {
            "custom" -> CustomApiSettingsSection(viewModel)
            "hosted" -> HostedApiSettingsSection()
        }

        // About Section
        AboutSection()
    }
}

@Composable
fun CustomApiSettingsSection(viewModel: SettingsViewModel) {
    val uiState = viewModel.uiState


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
                .padding(bottom = 12.dp)
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

@Composable
fun HostedApiSettingsSection() {

    Column(
        modifier = Modifier.padding(16.dp)
    ) {
        Text(
            text = "Coreply Hosted",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        Card(
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "🚧 Coming Soon",
                    style = MaterialTheme.typography.headlineSmall,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                Text(
                    text = "Hosted API service is currently available in a separate app. Please check our Github repo for details. It is planned to be integrated into this app in the future.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutSection() {
    val context = LocalContext.current

    Column(
        modifier = Modifier.padding(16.dp)
    ) {
        Text(
            text = "About",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        // GitHub Link
        Surface(
            onClick = {
                val uri = Uri.parse("https://github.com/coreply/coreply")
                val intent = Intent(Intent.ACTION_VIEW, uri)
                context.startActivity(intent)
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "🔗",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(end = 12.dp)
                )
                Text(
                    text = "View on GitHub",
                    style = MaterialTheme.typography.bodyLarge
                )
            }
        }

        // Instagram Link
        Surface(
            onClick = {
                val uri = Uri.parse("https://instagram.com/_u/coreply.app")
                val intent = Intent(Intent.ACTION_VIEW, uri)
                intent.setPackage("com.instagram.android")
                try {
                    context.startActivity(intent)
                } catch (e: ActivityNotFoundException) {
                    context.startActivity(
                        Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse("https://instagram.com/coreply.app")
                        )
                    )
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "📷",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(end = 12.dp)
                )
                Text(
                    text = "Follow on Instagram",
                    style = MaterialTheme.typography.bodyLarge
                )
            }
        }
    }
}

