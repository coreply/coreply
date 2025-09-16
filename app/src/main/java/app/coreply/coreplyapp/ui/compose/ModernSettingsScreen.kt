package app.coreply.coreplyapp.ui.compose

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
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
import app.coreply.coreplyapp.data.SuggestionPresentationType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ModernSettingsScreen(
    viewModel: SettingsViewModel = viewModel()
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var expandMenu by remember { mutableStateOf(false) }
    val uiState = viewModel.uiState

    val suggestionPresentationTypeStrings = listOf("Bubble below text field only", "Inline only", "Bubble and inline")

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
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
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

            ExposedDropdownMenuBox(
                expanded = expandMenu,
                onExpandedChange = { expandMenu = it },
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedTextField(
                    value = suggestionPresentationTypeStrings[uiState.suggestionPresentationType.ordinal],
                    readOnly = true,
                    onValueChange = {},
                    label = { Text("Suggestion mode") },
                    trailingIcon = {
                        ExposedDropdownMenuDefaults.TrailingIcon(
                            expanded = expandMenu
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(MenuAnchorType.PrimaryEditable, true)

                )
                ExposedDropdownMenu(
                    expanded = expandMenu,
                    onDismissRequest = { expandMenu = false },
                ) {
                    suggestionPresentationTypeStrings.forEachIndexed { index, selectionOption ->
                        DropdownMenuItem(
                            text = { Text(selectionOption) },
                            onClick = {
                                viewModel.updateSuggestionPresentationType(
                                    SuggestionPresentationType.fromInt(index)
                                )
                                expandMenu = false
                            },
                            leadingIcon = {
                                if (uiState.suggestionPresentationType.ordinal == index) {
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = null
                                    )
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
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
            label = { Text("Base URL") },
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


