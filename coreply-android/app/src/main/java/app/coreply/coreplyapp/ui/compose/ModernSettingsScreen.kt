package app.coreply.coreplyapp.ui.compose

import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuAnchorType
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.viewmodel.compose.viewModel
import app.coreply.coreplyapp.AppSelectorActivity
import app.coreply.coreplyapp.R
import app.coreply.coreplyapp.WelcomeActivity
import app.coreply.coreplyapp.data.SuggestionPresentationType
import app.coreply.coreplyapp.ui.viewmodel.SettingsViewModel
import app.coreply.coreplyapp.utils.GlobalPref

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ModernSettingsScreen(
    viewModel: SettingsViewModel = viewModel()
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var expandMenu by remember { mutableStateOf(false) }
    val uiState = viewModel.uiState

    val suggestionPresentationTypeStrings =
        listOf("Bubble below text field only", "Inline only", "Bubble and inline")

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

        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "Coreply Service",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 8.dp)
            )


            // Master Switch Section
            Row(
                modifier = Modifier
                    .fillMaxWidth().padding(vertical = 8.dp),
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
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
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
                        .menuAnchor(ExposedDropdownMenuAnchorType.PrimaryEditable, true)

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
                                        painter = painterResource(R.drawable.check_24px),
                                        contentDescription = null
                                    )
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }


            Row(
                modifier = Modifier
                    .fillMaxWidth().clickable{viewModel.updateShowErrors(!uiState.showErrors)}.padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Show errors",
                        style = MaterialTheme.typography.bodyLarge
                    )
                    Text(
                        text = "Display error messages in the overlay",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Checkbox(
                    checked = uiState.showErrors,
                    onCheckedChange = { viewModel.updateShowErrors(it) }
                )
            }


            // Select Apps Button

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        val intent = Intent(context, AppSelectorActivity::class.java)
                        context.startActivity(intent)
                    }.padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,

                ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "[BETA] Select Apps",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = "Choose apps enabling Coreply",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
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
                        painter = painterResource(if (showApiKey) R.drawable.visibility_off_24px else R.drawable.visibility_24px),
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
